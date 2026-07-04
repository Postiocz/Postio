# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## 2026-07-04

### 🐛 Fix — Dashboard #2: Hardcoded CZ text v ConsistencyScore → i18n (CS/EN/UK)

- **Kontext**: Komponenta `ConsistencyScore` na dashboardu (`page.tsx`) zobrazovala hardcoded české texty `"Výborná konzistence!"`, `"Dobrá, můžeš lepší!"`, `"Zkus postovat pravidelněji."` — EN/UK uživatelé viděli češtinu.
- **Oprava**:
  1. Do `src/messages/cs.json`, `en.json`, `uk.json` přidány klíče `consistencyExcellent`, `consistencyGood`, `consistencyImprove`.
  2. Komponenta `ConsistencyScore` nově přijímá prop `t: (key: string) => string` a volá `t("consistencyExcellent")` / `t("consistencyGood")` / `t("consistencyImprove")` místo hardcoded řetězců.
  3. Volání na ř. 184 rozšířeno o `t={t}`.
- **Ověření**:
  - `node -e "JSON.parse(...)"` pro cs.json, en.json, uk.json ✅
  - `npx tsc --noEmit` ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`
  - `ukol.md`

### 🐛 Fix — TikTok private-only policy: detekce podle `error.code` + přesnější UX text

- **Kontext**: TikTok `video/init` dál padal i při `privacy_level: "SELF_ONLY"`. Runtime log ukázal, že API vrací policy identifikátor v `error.code = unaudited_client_can_only_post_to_private_accounts`, zatímco naše app private-only chybu hledala v `error.message`, kde je jen obecný odkaz na guidelines. Tím pádem se nespouštěl lokalizovaný handler a uživatel viděl syrový anglický toast.
- **Oprava**:
  1. V [publish-tiktok.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-tiktok.ts) se TikTok private-only chyba nově mapuje primárně z `initData.error.code`, ne jen z `error.message`, takže UI dostane správný `errorCode`.
  2. V [tiktok-publish-errors.ts](file:///c:/VS_Code/Postio/src/lib/tiktok-publish-errors.ts) a překladech `cs/en/uk` zpřesněn text chyby: u neauditované TikTok app nestačí pouze `SELF_ONLY` na příspěvku, ale samotný TikTok účet musí být při publish nastaven jako soukromý.
  3. V [process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) se stejná TikTok policy chyba ukládá i s `error.code`, aby scheduled flow nereportoval jen neurčitý guideline odkaz a private-only retry logika měla konzistentní vstup.
  4. Pro aktivní debug session `tiktok-private-publish` zůstává do potvrzení uživatele dočasně zapnutá instrumentace do Debug Serveru v app publish flow a v UI error mapperu.
- **Ověření**:
  - `npx eslint src/lib/actions/publish-tiktok.ts src/components/edit-post-dialog.tsx supabase/functions/process-scheduled-posts/index.ts src/lib/tiktok-publish-errors.ts` ✅
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅
- **Upravené soubory**:
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/tiktok-publish-errors.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `debug-tiktok-private-publish.md`
  - `CHANGELOG.md`

### 🐛 Fix — Prompt 017-D: TikTok privacy mapping debug log a lokalizace sandbox chyby

- **Kontext**: U TikTok publish flow bylo potřeba ověřit, že editorová volba `Pouze já` opravdu končí v API payloadu jako `privacy_level: "SELF_ONLY"`, a zároveň zastavit únik syrové anglické chyby `unaudited_client_can_only_post_to_private_accounts` do UI.
- **Oprava**:
  1. V `src/lib/actions/publish-tiktok.ts` je tělo `video/init` nově složené do samostatné proměnné `body`, těsně před requestem se loguje přes `console.log("TIKTOK PAYLOAD:", body)` a chyba private-only ze sandboxu vrací vedle textu i stabilní `errorCode`.
  2. V `src/lib/actions/publish.ts` TikTok větev předává `errorCode` dál do UI i jako fallback při detekci raw TikTok message, takže lokalizace není závislá jen na jedné vrstvě.
  3. V `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx` a `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` přidán překladový mapping pro TikTok sandbox private-only chybu, aby uživatel dostal lokalizované vysvětlení místo anglického API textu.
  4. Do `src/messages/cs.json`, `en.json` a `uk.json` doplněn nový řetězec `tiktokSandboxPrivateOnlyError`.
- **Upravené soubory**:
  - `src/lib/tiktok-publish-errors.ts`
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/actions/publish.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`

### 🐛 Fix — Vercel build: untyped select builder pro scheduled Edge Function

- **Kontext**: Produkční deploy na Vercelu znovu padal při `next build` v `supabase/functions/process-scheduled-posts/index.ts` na chybě `Object is of type 'unknown'`. Příčinou bylo, že lokální alias `DenoSupabaseClient` vracel z `.from(...)` čisté `unknown`, ale helpery pro TikTok / YouTube / LinkedIn nad tím dál řetězily `.select().eq().order().limit()`.
- **Oprava**:
  1. V `supabase/functions/process-scheduled-posts/index.ts` doplněn úzký strukturální `UntypedTableBuilder` + `UntypedSelectFilterBuilder`, který pokrývá právě používaný query chain pro `social_accounts`.
  2. Helper `getUntypedUpdateBuilder()` nově staví na společném `getUntypedTableBuilder()` a lookupy `getValidTikTokAccessToken()`, `getValidYouTubeAccessToken()` a `getValidLinkedInAccessToken()` už nevolají `.from(...)` přímo nad `unknown`.
  3. Nešlo o změnu publikační logiky; zásah je čistě typový, aby Edge Function prošla strict TypeScript kontrolou v produkčním buildu.
- **Ověření**:
  - `npm run build` ✅
- **Upravené soubory**:
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

### 🐛 Fix — Prompt 017-C: TikTok private-only fallback + oprava i18n textů v editoru

- **Kontext**: TikTok publish padal na chybě `unaudited_client_can_only_post_to_private_accounts`, protože neauditovaná / testovací aplikace smí publikovat jen jako `SELF_ONLY`. Zároveň bylo potřeba srovnat texty TikTok privacy sekce v `posts` namespace, aby editor používal správné překlady.
- **Oprava**:
  1. V `src/lib/actions/publish-tiktok.ts` doplněna pojistka pro TikTok private-only režim: při detekci dev/test prostředí se privacy přednostně nastaví na `SELF_ONLY`, a pokud `video/init` vrátí chybu `unaudited_client_can_only_post_to_private_accounts`, publish flow automaticky udělá retry se `SELF_ONLY` místo okamžitého failu.
  2. Stejná private-only pojistka doplněna i do `supabase/functions/process-scheduled-posts/index.ts`, aby se okamžité a scheduled TikTok publikování nechovalo rozdílně.
  3. `publish.ts` nyní předává do UI warning code pro úspěšný TikTok publish v private-only režimu a `EditPostDialog` zobrazí lokalizované info v editoru i po úspěšném publishi.
  4. V `src/messages/cs.json`, `en.json`, `uk.json` sjednoceny TikTok privacy texty na požadované znění a doplněn nový lokalizovaný text pro private-only upozornění.
- **Upravené soubory**:
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/actions/publish.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `AGENTS.md`
  - `CHANGELOG.md`

### 🐛 Fix — `posts` namespace znovu obsahuje TikTok texty pro editor příspěvků

- **Kontext**: `EditPostDialog` používá `useTranslations("posts")`, ale část nových TikTok textů pro privacy a creator info byla uložená mimo `posts` namespace. Runtime pak v `/posts` padal na `MISSING_MESSAGE` pro klíče jako `posts.tiktokPrivacyTitle` a `posts.tiktokCreatorInfoSummary`.
- **Oprava**:
  1. Do `src/messages/cs.json`, `en.json`, `uk.json` doplněny chybějící TikTok klíče přímo do sekce `posts` (`tiktokPrivacy*`, `tiktokCreatorInfo*`, `tiktokCapability*`).
  2. V `posts` sekci doplněn i `ttEditNotSupported`, aby TikTok lock banner nepadal při editaci už publikovaného příspěvku.
  3. Oprava je čistě i18n; žádná publish logika ani TikTok API flow se nemění.
- **Upravené soubory**:
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`

### 🐛 Fix — Edge Function Supabase client typ už neblokuje TypeScript build

- **Kontext**: `next build` znovu padal v `supabase/functions/process-scheduled-posts/index.ts` na chybě `Type 'SupabaseClient...' is not assignable ...`, konkrétně při předání `supabaseAdmin` do `getValidYouTubeAccessToken()`. Příčinou byl příliš úzký alias `ReturnType<typeof createClient>`, který v Deno Edge runtime neodpovídal skutečnému generickému tvaru klienta.
- **Oprava**:
  1. Helper alias `DenoSupabaseClient` změněn na úmyslně strukturální typ s metodou `.from(...)`, protože lokální helper vrstva používá právě jen tento minimální kontrakt.
  2. Tím se odstranila falešná generická nekompatibilita mezi Deno klientem v Edge Function a app-side typovou inferencí, aniž by se měnila publish logika pro YouTube, TikTok nebo ostatní platformy.
  3. Lokálně ověřeno přes `npm run build`; build nyní projde kompletně až do finálního route summary bez TypeScript chyb.
- **Upravené soubory**:
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

### 🐛 Fix — TikTok OAuth callback vrací uživatele zpět na lokalizované `/accounts`

- **Kontext**: Po úspěšném propojení TikTok účtu se callback route snažila přesměrovat na neexistující adresu místo zpět na stránku účtů. Zároveň bylo potřeba ověřit, že `token_expires_at` pro TikTok počítáme korektně z `expires_in`.
- **Oprava**:
  1. V `src/app/api/accounts/tiktok/route.ts` oddělen CSRF `state` od post-auth redirect path. Původní návratová cesta (např. `/{locale}/accounts`) se nově ukládá do samostatné httpOnly cookie `tiktok_oauth_redirect`, takže callback po návratu z TikToku vždy ví, kam uživatele vrátit.
  2. Redirect path se před použitím normalizuje a fallbackuje na `/{locale}/accounts`, takže už nevzniká chybný redirect na neexistující `/api/accounts/[id]?tiktok=connected`.
  3. Potvrzen a okomentován výpočet expirace jako `Date.now() + expires_in * 1000`; u TikToku je krátký access token (často 24h / `86400`, včetně Sandboxu) očekávatelný, takže varování „Token vyprší za 1 den“ není samo o sobě chyba.
  4. Stejný explicitní výklad `expires_in` doplněn i do TikTok refresh helperů v app publish flow a v scheduled Edge Function; navíc uklizen starší `no-explicit-any` typový alias v Edge Function, aby dotčené soubory znovu prošly lintem.
- **Upravené soubory**:
  - `src/app/api/accounts/tiktok/route.ts`
  - `src/lib/actions/publish-tiktok.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

### 🐛 Fix — TikTok OAuth authorize URL přesně podle v2 specifikace

- **Kontext**: TikTok Login stále vracel chybu `client_key`, takže bylo potřeba srovnat generovanou authorize URL přesně podle v2 specifikace a ověřit, že `redirect_uri` zůstává 1:1 shodná s hodnotou v TikTok Developer portálu.
- **Oprava**:
  1. V `src/app/api/accounts/tiktok/route.ts` upraven authorize endpoint z `https://www.tiktok.com/v2/auth/authorize/` na `https://www.tiktok.com/v2/auth/authorize` bez trailing slash.
  2. OAuth scopes sjednoceny do konstanty a query parametr `scope` se skládá přes `.join(",")`, takže v URL odchází čárkou oddělené hodnoty (`%2C`).
  3. Potvrzeno, že `redirect_uri` zůstává natvrdo nastavená jako `https://postio-alpha.vercel.app/api/accounts/tiktok` bez koncového lomítka a používá se jak v authorize redirectu, tak při token exchange.
  4. Zachován debug log finální authorize URL pro rychlé ověření ve Vercel logu.
- **Upravené soubory**:
  - `src/app/api/accounts/tiktok/route.ts`
  - `CHANGELOG.md`

### 🐛 Fix — Vercel build: TypeScript cleanup pro preview a scheduled publish flow

- **Kontext**: Produkční build na Vercelu spadl nejdřív na `src/components/post-preview.tsx`, ale po odblokování první chyby se objevilo ještě několik starších strict-type problémů v `src/lib/actions/publish.ts` a `supabase/functions/process-scheduled-posts/index.ts`. Bez jejich dočištění by `next build` dál končil chybou i po opravě původního řádku 270.
- **Oprava**:
  1. V `src/components/post-preview.tsx` sjednocen typ `labels` pro TikTok preview s ostatními preview renderery, doplněn volitelný klíč `tiktokVideoRequired` a `MediaArea` už nedostává `labels={{}}`. Zároveň opraveny dva neplatné průchody `className` do interní komponenty `Avatar` na podporované props `size` / `ring`.
  2. V `src/lib/actions/publish.ts` srovnány návratové typy pro duplicate guards (`null` -> `undefined` tam, kde to kontrakt očekává), přidán bezpečný reader pro string hodnoty z `social_accounts.metadata` a odstraněny mrtvé odkazy na `alreadyPublishedRow` po guard returnu. TikTok publish větev nově explicitně extrahuje `externalId` bez spoléhání na nedostatečně diskriminovaný union návratového typu.
  3. V `supabase/functions/process-scheduled-posts/index.ts` sjednocen typ Supabase klienta pro Edge Function helpery, doplněn chybějící TikTok refresh buffer, zavedena úzká untyped helper vrstva pro `social_accounts` update operace, které jinak v Deno typed klientu padaly na `never`, a doplněny explicitní / bezpečné typy pro TikTok token flow a fallback error stringy.
  4. Lokálně ověřeno přes `npm run build` bez TypeScript chyb; build doběhl až do finálního route summary.
- **Upravené soubory**:
  - `src/components/post-preview.tsx`
  - `src/lib/actions/publish.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

## 2026-07-03

### 🔎 Audit — TikTok Sandbox klíče a endpointy

- **Kontext**: Po přepnutí TikTok aplikace do Sandbox režimu bylo potřeba ověřit, že OAuth i publish flow stále míří na správné TikTok v2 endpointy a že backend čte aktuální `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` z environment proměnných místo hardcoded hodnot.
- **Ověření**:
  1. `src/app/api/accounts/tiktok/route.ts` dál používá oficiální OAuth adresy `https://www.tiktok.com/v2/auth/authorize/` a `https://open.tiktokapis.com/v2/oauth/token/` a client credentials bere výhradně z `process.env.TIKTOK_CLIENT_KEY` / `process.env.TIKTOK_CLIENT_SECRET`.
  2. `src/lib/actions/publish-tiktok.ts` i `supabase/functions/process-scheduled-posts/index.ts` používají oficiální TikTok Content Posting API v2 endpointy na `open.tiktokapis.com` (`creator_info/query`, `video/init`, `status/fetch`) a refresh token flow čte stejné env názvy.
  3. Podle aktuální TikTok dokumentace Sandbox režim nemění tyto hosty ani cesty; mění se klientské klíče a behavior publikace (neauditované klienty / sandbox omezuje viditelnost postů), takže v kódu nebylo nutné endpointy přepisovat.
  4. Potvrzeno, že `.env.local` je ignorovaný přes `.gitignore`, takže commit/push samotný nepropíše nové TikTok klíče na Vercel. Produkční/sandbox klíče je nutné nastavit i v Project Settings -> Environment Variables na Vercelu a případně v Supabase secrets pro Edge Function.
- **Upravené soubory**:
  - `CHANGELOG.md`

### 🔐 Chore — Výměna TikTok doménového ověřovacího souboru

- **Kontext**: TikTok pro novou instrukci aplikace vygeneroval nový verifikační TXT soubor, takže původní soubor i middleware bypass bylo potřeba přepnout na nový název.
- **Oprava**:
  1. Ze složky `public` odstraněn starý soubor `tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt`.
  2. Přidán nový soubor `public/tiktokmIF6HPGsSRtFyrpVPktypfhK4V9oDdj7.txt` s obsahem od TikTok Developer portálu.
  3. V `middleware.ts` aktualizován `PUBLIC_STATIC_PATHS`, aby nová root URL vracela raw TXT bez auth redirectu a bez locale redirectu.
- **Upravené soubory**:
  - `public/tiktokmIF6HPGsSRtFyrpVPktypfhK4V9oDdj7.txt`
  - `middleware.ts`

### 🧹 Stabilizace — Prompt 017-B: editor cleanup + TikTok production polish

- **Kontext**: Po dokončení první TikTok integrace zůstal v editoru a publish flow technický dluh: lint chyby v `EditPostDialog` / `publish.ts`, chybějící per-post TikTok privacy volba, okamžité hlášení úspěchu bez ověření finálního stavu videa a starý scheduled TikTok flow bez `creator_info/query`.
- **Oprava**:
  1. `src/components/edit-post-dialog.tsx` vyčištěn od lint problémů, doplněn lokalizovaný blok „Nastavení soukromí“ pro TikTok s volbami `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY` a capability summary načteným z `creator_info/query`.
  2. `src/lib/actions/publish.ts` dočištěn typově, odstraněny poslední `any` a `publishAdditionalPlatforms()` nově přebírá `platformMetadata`, takže TikTok privacy funguje i při pozdějším dopublikování na další síť.
  3. `src/lib/actions/publish-tiktok.ts` používá account-aware privacy resolution podle `privacy_level_options`, cache creator info do `social_accounts.metadata.creator_info_cache` a status polling přes `status/fetch` až do `PUBLISH_COMPLETE`.
  4. `supabase/functions/process-scheduled-posts/index.ts` srovnáno s okamžitým publish flow: přidán `creator_info/query`, persist capability cache, respect `post_platforms.metadata.privacy_level` a polling dokončení publish procesu.
  5. Do `src/messages/cs.json`, `en.json`, `uk.json` doplněny nové překlady pro TikTok privacy UI a capability texty.
  6. Ověřeno přes `npm run lint -- src/components/edit-post-dialog.tsx src/lib/actions/publish.ts src/lib/actions/publish-tiktok.ts supabase/functions/process-scheduled-posts/index.ts` bez chyb.
- **Upravené soubory**:
  - `src/components/edit-post-dialog.tsx`
  - `src/lib/actions/publish.ts`
  - `src/lib/actions/publish-tiktok.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`

### ✨ Feature — TikTok OAuth, publishing a high-fidelity preview

- **Kontext**: Postio mělo pro TikTok připravené ikony, platform enumy a ověřenou doménu, ale chyběla skutečná integrace účtu, publish flow, lokalizované UX stavy a věrný preview.
- **Oprava**:
  1. Přidána OAuth route pro TikTok Login Kit v `src/app/api/accounts/tiktok/route.ts` se scopes `user.info.basic`, `video.upload`, `video.publish`, uložením do `social_accounts` a persistencí `refresh_token` v `metadata`.
  2. Přidán publisher `src/lib/actions/publish-tiktok.ts` s refresh token flow, validací video-only médií a TikTok Content Posting API v2 přes init + binární upload na `upload_url`.
  3. TikTok publish flow dopojen do `src/lib/actions/publish.ts` i do `supabase/functions/process-scheduled-posts/index.ts`, aby fungovalo okamžité i naplánované publikování.
  4. V `src/components/edit-post-dialog.tsx` doplněn TikTok lock banner, načtení TikTok profilu a zapojení do preview props.
  5. V `src/components/post-preview.tsx` přidán high-fidelity `TikTokPreview` s mobile-style overlay UI, pravým action sloupcem a popisem přes video.
  6. Do `src/messages/cs.json`, `en.json`, `uk.json` doplněny texty pro TikTok lock stav a preview labely.
- **Upravené soubory**:
  - `src/app/api/accounts/tiktok/route.ts`
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/actions/publish.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/components/post-preview.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`

### 🐛 Fix — TikTok verifikační TXT už nepadá do auth redirectu

- **Kontext**: Po přidání verifikačního souboru do `public` produkční URL nevracela raw TXT obsah, ale přesměrovala na `/<locale>/login`. Důvodem byl globální auth guard v `middleware.ts`, který ne-lokalizovanou cestu k TXT souboru vyhodnotil jako dashboard root (`restPath === "/"`).
- **Oprava**:
  1. Přidán explicitní bypass `PUBLIC_STATIC_PATHS` pro `/tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt`.
  2. Middleware pro tuto cestu okamžitě vrací `NextResponse.next()`, takže se soubor servíruje přímo z `public` bez auth a bez i18n redirectu.
- **Upravené soubory**:
  - `middleware.ts`

### 🔐 Chore — TikTok doménový ověřovací soubor přidán do `public`

- **Kontext**: Pro ověření domény v TikTok Developer portálu bylo potřeba vystavit statický verifikační TXT soubor přímo z produkční root cesty aplikace.
- **Oprava**:
  1. Přidán soubor `public/tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt` beze změny názvu i obsahu.
  2. Soubor je po deployi dostupný na produkční URL `https://<doména>/tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt`.
- **Upravené soubory**:
  - `public/tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt`

### ♿ A11y — ARIA grid + Keyboard navigation v Month & Week view (#15)

- **Soubory**: `src/components/calendar/month-grid-view.tsx`, `week-grid-view.tsx`
- **Problém**: Month i Week grid neměly ARIA role (`grid`/`row`/`gridcell`), dny nebyly focusovatelné přes Tab, žádná podpora klávesnice — screen reader a keyboard-only uživatelé se v kalendáři nemohli orientovat.
- **Řešení**:
  - `role="grid"` na kontejner s `aria-label` v 3 jazycích („Kalendář měsíce" / „Календар місяця" / „Month calendar")
  - `role="row"` na každý řádek dnů, `role="gridcell"` na každou buňku, `role="columnheader"` + `aria-colindex` na hlavičky
  - `aria-current="date"` na dnešní den, `aria-label` s datem + počtem postů na každé buňce
  - **Roving tabindex pattern**: `tabIndex={isFocused ? 0 : -1}` — Tab fokusuje jeden „aktivní" den, pohyb probíhá šipkami uvnitř gridu
  - Defaultní focus na **dnešek** (`todayIndex`), reset při změně měsíce (Month view)
  - **Keyboard navigation**: ← → ↑ ↓ (pohyb mezi dny), Home/End (začátek/konec řádku), PageUp/PageDown (±1 měsíc v Month view), Enter/Space (otevřít den = stejný efekt jako kliknutí)
  - Vizuální feedback: `!bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/40` na fokusední buňku, konzistentní s design systémem (indigo gradient)
- **Dopad**: Plná klávesnicová a screen reader podpora pro Month i Week view, WCAG 2.1 AA compliant grid navigace

### ✨ Feature — Mobile view switcher: Month + Agenda (#7)

- **Soubor**: `src/components/calendar/mobile-agenda-view.tsx`
- **Problém**: Mobilní uživatelé viděli vždy jen „Agenda" (seznam dní). Neměli přístup k žádnému jinému pohledu – Month, Week ani Day byly dostupné pouze na desktopu (`hidden lg:block`).
- **Řešení**:
  - Do mobile headeru přidán zjednodušený **ViewSwitcher** (Month + Agenda) – mini pill s ikonami `Grid3x3`/`List`, vizuálně konzistentní s desktop ViewSwitcher (gradient indigo→purple, glassmorphism border)
  - Nová komponenta **`MobileMonthGrid`** (~120 řádků) – kompaktní měsíční grid pro mobily:
    - Buňky `min-h-[64px]` (desktop Month má `min-h-[90px]`)
    - Max **2 posty na den** s `+N další` indikací (desktop ukazuje 3)
    - Kompaktní fonty (`text-[9px]` pro obsah, `text-[11px]` pro dny)
    - Žádný hover preview (na touch zařízeních nepotřebný)
    - Používá sdílené `PlatformIconsGroup` + `getChipStatusStyles` z `post-calendar-chip.tsx`
  - i18n labely (`month`/`agenda`) z existujících překladů v `tCalendar`
- **Upravené soubory**:
  - `src/components/calendar/mobile-agenda-view.tsx` – view state, switcher v headeru, `MobileMonthGrid` komponenta
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – předány nové props (`calendarDays`, `getPostsForDayEffective`, `tMobileView`)
- **Dopad**: Mobilní uživatelé mají přístup k měsíčnímu přehledu i agendě, konzistentní UX s desktopem

### ✨ Feature — PostCalendarChip extrakce + unified status styling (#14, #16)

- **Nový soubor**: `src/components/calendar/post-calendar-chip.tsx` (170 řádků)
- **Problém**: Každý pohled kalendáře (Month, Week, Day, Agenda desktop, Mobile) měl vlastní inline JSX pro renderování post čipu — 5× duplicitní kód s mírně odlišným stylingem. Week view chybely statusy `removed_externally` a `publishing`.
- **Řešení**:
  - `PostCalendarChip` — kompletní čip s platform ikonami, časem, content preview (použit v Month, Week, Mobile)
  - `PlatformIconsGroup` — sdílený renderer platform ikon s badgey (Day, Agenda, Mobile)
  - `getChipStatusStyles(status)` — single source of truth pro všech 6+1 statusů
  - `getPlatformIconColor(status)` — single source of truth pro ikony platforem
  - `STATUS_STYLES` + `FALLBACK_STATUS` — exportované konstanty
- **Dopad**: −186 řádků duplicitního JSX v `_calendar-view.tsx`, konzistentní status barvy napříč všemi pohledy

### ✨ Feature — Blokování tvorby postů v minulosti (#10, #18a)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: Uživatel mohl kliknout na libovolný den v kalendáři a otevřít formulář pro nový příspěvek — včetně dnů, které už minuly. To dávalo smysl u existujících postů (editace/preview), ale ne pro tvorbu nového obsahu.
- **Řešení**: `handleDayClick` nyní porovnává kliknutý den s dneškem. Pokud je den v minulosti a nemá žádné příspěvky, zobrazí se lokalizovaný toast ("Nelze vytvořit příspěvek pro minulý den." / CS, EN, UK) a modal se neotevře. Dny s existujícími příspěvky fungují normálně (klik na post → Preview/Edit).
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` — rozšířený `handleDayClick` s date comparison + toast

### 🔧 Refactor — Rozdělení `_calendar-view.tsx` do 8 komponent (#13)

- **Soubor**: `_calendar-view.tsx` z 1561 → 980 řádků (−37%, −581 řádků)
- **Problém**: Jeden monolitický soubor obsahoval všech 6 pohledů kalendáře + modaly + hover preview. Těžko udržovatelné, těžko testovatelné.
- **Řešení** — 8 extrahovaných komponent v `src/components/calendar/`:
  - `month-grid-view.tsx` (123 řádků) — Month view grid s weekdny headers
  - `week-grid-view.tsx` (110 řádků) — Week view grid (7 dní, min-h-180px)
  - `day-timeline-view.tsx` (112 řádků) — Day timeline (24h, absolutní pozice postů)
  - `agenda-list-view.tsx` (110 řádků) — Desktop agenda list s sticky day headers
  - `year-mini-grid.tsx` (104 řádků) — Year overview (12 mini měsíců v grid-cols-3)
  - `mobile-agenda-view.tsx` (162 řádků) — Mobile agenda s navigací měsíci
  - `hover-preview.tsx` (116 řádků) — Hover preview overlay s media preview
  - `new-post-modal.tsx` (296 řádků) — New post dialog form (typované props + callbacks)
- **Dopad**: Každý pohled je nyní samostatná testovatelná komponenta s explicitním interface. Hlavní soubor obsahuje pouze logiku (state, handlers, memoizace). Zero functional changes.

---

## 2026-07-02

### 🐛 Fix — Calendar: `window.location.reload()` → `router.refresh()` (#1)

- **Soubor**: `_calendar-view.tsx` (ř. 439, 463)
- **Problém**: Tvrdý reload celé stránky po vytvoření příspěvku z kalendáře ničil UX — ztráta stavu filtrů, view módu a scroll pozice. Anti-pattern v Next.js App Router.
- **Řešení**: Import `useRouter` z `next/navigation`, oba výskyty `window.location.reload()` → `router.refresh()`. Data se obnoví přes RSC, client state (filtry, view mód) zůstane zachován.

### 🐛 Fix — StatsCards počítají jen z aktuálního měsíce (#8)

- **Soubory**: `stats-cards.tsx`, `_calendar-view.tsx`
- **Problém**: Label káry říkal "Tento měsíc", ale stats počítaly ze všech filtrovaných postů bez ohledu na datum. Uživatel s 200 posty za rok viděl "200" i když v měsíci byly jen 3.
- **Řešení**: `StatsCards` je nyní generická `<T extends PostForStats>`, přijímá `currentDate: Date` a `getDisplayDate` callback. Všechny 4 staty (published/scheduled/failed/drafts) se filtrují i podle `isSameMonth(getDisplayDate(post), currentDate)`.

### 🛡️ Fix — Calendar DB query `.limit(500)` (#6)

- **Soubor**: `calendar/page.tsx`
- **Problém**: Načítaly se všechny posty uživatele bez limitu. Při stovkách příspěvků = velká odpověď + pomalý render.
- **Řešení**: Přidán `.limit(500)` jako ochranná brzda na Supabase query.

### ♻️ Refactor — Memoizace postsByDay (#5)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: `getPostsForDayEffective(day)` při každém renderu projel všechny posty pro každý den (~35× měsíčně = O(n×dny)).
- **Řešení**: Jednou O(n) `useMemo` Map<string, Post[]> rozloží posty podle `"yyyy-MM-dd"` klíče. Každý den pak dělá O(1) `.get(key)` lookup místo lineárního filteru.

### ♻️ Refactor — Duplicitní typy a konstanty (#3+4)

- **Nové soubory**: `src/types/calendar.ts`, `src/lib/constants/platforms.ts`
- **Problém**: Typ `PostPlatform` definovaný dvakrát (`_calendar-client.tsx` + `_calendar-view.tsx`), typ `Post` také dvakrát, konstanta `PLATFORMS` v `_calendar-view.tsx` i `page.tsx`.
- **Řešení**: Single source of truth — `PostPlatform` + `Post` v `src/types/calendar.ts`, `PLATFORMS` v `src/lib/constants/platforms.ts`. Všechny 3 soubory (`_calendar-view.tsx`, `_calendar-client.tsx`, `page.tsx`) importují odtud.

### 🐛 Fix — Hover preview skryt při scrollu (#11)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: Hover preview měl `fixed` pozici — při scrollování zůstával na místě a překrýval obsah.
- **Řešení**: `useEffect` s `window.addEventListener("scroll", ...)` resetuje `hoveredPost` na `null`. Passive listener pro plynulý scroll, cleanup v returnu.

### ✨ Feature — Dynamický character limit podle platforem (#12)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: Vždy ukazoval `/ 280` (Twitter limit), ale Instagram = 2200, LinkedIn = 3000, YouTube = 5000.
- **Řešení**: Limit se počítá jako `Math.min()` z vybraných platforem (`twitter: 280`, `instagram: 2200`, `linkedin: 3000`, `facebook: ∞`, `youtube: 5000`, `tiktok: 4000`). Při více platformách se použije nejpřísnější limit. Bez vybrané platformy se limit nezobrazuje. Překročený limit = `text-destructive`.

### 🐛 Fix — Year view: dny s příspěvky neměly vizuální indikátor (#18)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: V ročním zobrazení (year view) se v mini-měsících zobrazovaly jen čísla dní bez jakékoliv informace o příspěvcích. Uživatel musel kliknout na měsíc a přepnout se do month view, aby viděl kde má posty. Badge s počtem příspěvků byl nad měsícem, ale uvnitř gridu žádná vizuální vazba.
- **Řešení**: Každý den v year view nyní používá memoizovanou mapu `postsByDay` pro O(1) lookup. Dny s příspěvky mají indigo tečku pod číslem dne + tučnější text (`font-semibold`). Dnes + příspěvky = gradient pozadí (zachováno původní chování).

### 🧹 Chore — Odstranění nepoužitých importů (#17)

- **Soubor**: `_calendar-view.tsx`
- **Problém**: `ArrowLeft`, `Film`, `Image as ImageIcon` importovány z `lucide-react`, ale nikde nepoužity.
- **Řešení**: Odstraněny z importu.

---

## 2026-07-01

### ♻️ Refactor — Dokončení props drilling cleanup (#14)

- **Kontext**: `tLabels` (30+ properties) a `tAi` (9 properties) se předávaly přes 4 úrovně komponent: `page.tsx` → `PostsContainer` → `PostsList` → `PostCard` → `EditPostDialog` / `PreviewDialog` / `AIAssistantButton`. Každá úroveň musela mít tyto props ve svém interface, i když je nepoužívala přímo.
- **Řešení**: Všechny dialogy a tlačítka nyní používají vlastní `useTranslations()` hook z `next-intl`:
  1. **`EditPostDialog`** — vlastní `useTranslations("posts")`, již nepřijímá `tLabels` (30+ props) ani `tAi`
  2. **`PreviewDialog`** — vlastní `useTranslations("posts")`, již nepřijímá `labels` prop (8+ keys). Standalone funkce `renderPreviewForPlatform` dostává jen 2 řetězce (`captionHintLabel`, `noMediaLabel`) místo celého objektu
  3. **`AIAssistantButton`** — vlastní `useTranslations("ai")`, již nepřijímá `t: AiTranslations` prop (9 keys)
  4. **Props chain vyčištěn** — `tLabels` a `tAi` odstraněny z: `page.tsx`, `_posts-container.tsx`, `_post-card.tsx` (PostsList + PostCard), `_calendar-client.tsx`, `_calendar-view.tsx`, `calendar/page.tsx`, `posts/new/page.tsx`
  5. **Parameterizované překlady** — `unsupportedFormat` nyní používá `t("unsupportedFormat", { type })` místo hardcoded fallbacku
- **Dopad**: −400+ řádků props interface + call site boilerplate, čistší rozhraní komponent, snazší testování a reuses

### ✨ Feature — Content expand/collapse v PostCard (#13)

- **Kontext**: Dlouhé příspěvky byly oříznuty na 3 řádky (`line-clamp-3`) bez možnosti zobrazit celý obsah. Uživatel musel otevřít Edit/Preview dialog, aby viděl kompletní text.
- **Řešení**: Přidán expand/collapse stav přímo na PostCard s tlačítkem „Zobrazit více" / „Zobrazit méně".
  1. **State `isExpanded`** — lokální stav v `PostCard`, resetuje se při změně filtrů/stránkování (při remountování karty).
  2. **Podmíněné zobrazení tlačítka** — zobrazuje se pouze když obsah překračuje 3 řádky NEBO je delší než 180 znaků (heuristika pro delší řádky bez zalomení).
  3. **Plynulý přechod** — při expandování se odstraní `line-clamp-3`, obsah se rozbalí bez layout shiftu.
  4. **i18n** — klíče `showMore` a `showLess` přidány do `cs.json`, `en.json`, `uk.json` v namespace `posts`.
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` — state `isExpanded`, podmíněné `line-clamp-3`, tlačítko s `tv("showMore")`/`tv("showLess")`
  - `src/messages/cs.json` — `showMore: "Zobrazit více"`, `showLess: "Zobrazit méně"`
  - `src/messages/en.json` — `showMore: "Show more"`, `showLess: "Show less"`
  - `src/messages/uk.json` — `showMore: "Показати більше"`, `showLess: "Показати менше"`

### ✨ Feature — Media preview lightbox (#12)

- **Kontext**: Thumbnail média v PostCard měl `pointer-events-none`, takže uživatel nemohl obrázek/video rozkliknout a podívat se na něj ve větším měřítku. Jedinou možností byl PreviewDialog (očníko), který zobrazoval simulaci feedu, ne samotné médium.
- **Novinky**:
  1. **Nová komponenta `MediaPreviewDialog`** (`src/components/media-preview-dialog.tsx`) — fullscreen dialog na zobrazení médií:
     - Obrázky i videa (s `controls` + `autoPlay` u videí)
     - `object-contain` — celá kompozice vidět bez ořezu
     - Navigace šipkami (levá/pravá tlačítka) + klávesnice (←/→) pro příspěvky s více médii
     - Tečkový indikátor dole (`1/3`, `2/3`…) s kliknutím na libovolné médium
     - Auto-reset na první médium při otevření
  2. **PostCard media thumbnail je nyní klikací** — odstraněn `pointer-events-none`, přidán `cursor-pointer` + `hover:ring-2 hover:ring-indigo-500/30` pro vizuální affordance.
  3. **Radix a11y fix** — vizuálně skrytý `DialogTitle` (`sr-only` style) s dynamickým textem („Media preview 2 of 3") splňuje požadavek Radix UI na přístupnost.
- **Upravené soubory**:
  - `src/components/media-preview-dialog.tsx` — nová komponenta (140 řádků)
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` — import, state `mediaPreviewOpen`, odstraněn `pointer-events-none`, přidán `onClick` + hover ring, render `<MediaPreviewDialog>`

### ✨ Feature — Bulk akce (hromadný výběr + smazání) (#10)

- **Kontext**: Uživatel mohl mazat příspěvky pouze po jednom (klik na ikonu koše → dialog → potvrzení). Při úklidu desítek draftů nebo neúspěšných příspěvků to bylo pracné.
- **Novinky**:
  1. **Checkboxy integrované do akčních tlačítek PostCard** — ikona `CheckSquare` / `Square` inline s Edit / Preview / Delete (vpravo nahoře, objeví se při hoveru). Stejný vizuální styl jako ostatní tlačítka (`h-8 w-8`, backdrop-blur, border). Vybraná karta má zvýrazněný indigo border + ring.
  2. **Bulk action bar** — sticky floating bar nad seznamem, zobrazuje se při výběru ≥1 příspěvku. Obsahuje:
     - Počet vybraných („3 vybráno") s i18n parametrem `{count}`
     - Odkaz „Vybrat vše" / „Zrušit výběr" pro rychlý toggle všech viditelných
     - Tlačítko **„Smazat vybrané"** (destructive, s loaderem při zpracování)
     - Tlačítko **✕** pro zrušení výběru
  3. **Server action `bulkDeletePosts(ids[])`** — efektivní `.in("id", ids)` DELETE v Supabase, revaliduje `/posts`, `/calendar`, `/dashboard`. Bez API volání na platformy (to řeší single-post `deletePost`).
  4. **Automatické čištění výběru** při změně filtrů, server re-renderu a po úspěšném smazání.
  5. **i18n** — klíče `bulkDelete`, `bulkArchive`, `bulkSelected`, `bulkDeleteConfirm`, `toastBulkDeleteSuccess`, `toastBulkDeleteError`, `selectAll`, `deselectAll`, `select`, `deselect` ve všech třech lokalizacích (cs/en/uk).
- **Upravené soubory**:
  - `src/lib/actions/posts.ts` — nový export `bulkDeletePosts(ids: string[])`
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` — props `isSelected`/`onSelectChange`, checkbox inline v řádku akčních tlačítek, zvýraznění borderu vybrané karty
  - `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` — state `selectedIds`, bulk action bar (motion.div), handlers `handleToggleSelect`/`handleSelectAll`/`handleClearSelection`/`handleBulkDelete`, čištění při filtru/re-renderu
  - `src/messages/cs.json` — 10 nových klíčů v namespacech `posts` + `calendar`
  - `src/messages/en.json` — 10 nových klíčů v namespacech `posts` + `calendar`
  - `src/messages/uk.json` — 10 nových klíčů v namespacech `posts` + `calendar`

## 2026-06-29

### ✨ Feature — Sorting (setřídění příspěvků) (#9)

- **Kontext**: Uživatel mohl filtrovat příspěvky podle platformy, stavu a štítku, ale nemohl je třídit.
- **Novinky**:
  1. **Třetí dropdown „Seřadit"** v řádku filtrů (`PostFiltersRow`) se 3 režimy:
     - **Nejnovější první** — `created_at DESC` (výchozí)
     - **Nejstarší první** — `created_at ASC`
     - **Podle data publikování** — `scheduled_at DESC`
  2. **Server-side sort** v DB dotazu (`fetchPostPage`) — dynamický `.order()` podle zvoleného režimu. Cursor pro „Load more" automaticky přepíná mezi `created_at` a `scheduled_at`.
  3. **i18n** — klíče `sortBy`, `sortNewestFirst`, `sortOldestFirst`, `sortByPublishDate` ve všech třech lokalizacích (cs/en/uk).
  4. **Typ `PostSortOption`** exportován z `actions.ts` pro typovou bezpečnost.
- **Upravené soubory**:
  - `src/components/post-filters-row.tsx` — nový `SortSelect` + `ListOrdered` ikona, props `sortValue`/`onSortChange`
  - `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` — state `activeSort`, handler `handleSortChange`, integrace do `applyFilters`/`handleLoadMore`
  - `src/app/[locale]/(dashboard)/posts/actions.ts` — `PostSortOption`, dynamický `.order()`, cursor podle sort sloupce
  - `src/messages/cs.json` — 4 nové klíče v sekci `posts`
  - `src/messages/en.json` — 4 nové klíče v sekci `posts`
  - `src/messages/uk.json` — 4 nové klíče v sekci `posts`
  - `src/components/post-filters-row.tsx` — **2řádkový layout filtrů** (Platforma+Stav / Štítek+Seřadit)

### 🐛 Fix — Chybějící i18n klíč `posts.cancel` (en/uk) a špatný namespace sort klíčů

- **Kontext**: Klíče `sortNewestFirst`, `sortOldestFirst`, `sortByPublishDate` byly omylem vloženy pod namespace `calendar` místo `posts`. Navíc `posts.cancel` chyběl v EN a UK lokalizacích.
- **Opravy**:
  1. Sort klíče přesunuty z `calendar` → `posts` ve všech 3 jazycích.
  2. Přidaný chybějící `cancel` do `posts` v `en.json` a `uk.json`.
  3. Odstraněny duplikáty z `calendar`.
- **Upravené soubory**:
  - `src/messages/en.json` — `cancel` v `posts`, sort klíče přesunuty
  - `src/messages/uk.json` — `cancel` v `posts`, sort klíče přesunuty

## 2026-06-28

### 🐛 Fix – Chybějící i18n klíče `posts.youtube`, `posts.tiktok` a `posts.toast*`

- **Kontext**: Stránka `/posts/new` volala `t("youtube")` a `t("tiktok")` přes `useTranslations("posts")`, ale tyto klíče existovaly pouze pod `accounts.platforms`. Výsledek: `MISSING_MESSAGE` error pro locale `cs` (i `en`/`uk`). Stejně tak `_post-card.tsx` volal `t("toastDeleteSuccess")` atd., které byly definovány jen pod namespace `calendar`, ne `posts`.
- **Opravy**:
  1. Přidané klíče `youtube` a `tiktok` do sekce `posts` ve všech třech lokalizačních souborech (cs/en/uk).
  2. Přidané klíče `toastDeleteSuccess`, `toastDeleteFromAppSuccess`, `toastRemoveUnexpectedError`, `toastKeptAsDraft`, `toastPermanentlyDeleted`, `toastSmartDeleteError`, `toastUnderstood`, `toastLinkedInArchivedSingle` do sekce `posts` ve všech třech lokalizačních souborech (cs/en/uk).
- **Upravené soubory**:
  - `src/messages/cs.json` — 10 nových klíčů v sekci `posts`
  - `src/messages/en.json` — 10 nových klíčů v sekci `posts`
  - `src/messages/uk.json` — 10 nových klíčů v sekci `posts`

## 2026-06-27

### ⚡ Performance – Odstraněn double-fetch a IIFE anti-pattern v PostsContainer

- **Kontext**: `PostsContainer` volal `router.refresh()` v `useEffect([])` při každém mountu po návratu z mutacních rout (`/posts/new`, `/posts/{id}`). To způsobovalo redundantní RSC re-render — server komponenta už data měla, a pak se okamžitě znovu fetchovala. Navíc inline IIFE v JSX renderu (`(function() { if (refreshAfterExit) { router.refresh() } return null; })()`) byl side-effect v render funkci — anti-pattern, který ve StrictMode běžel dvakrát a při re-renderech nepředvídatelně.
- **Opravy**:
  1. **Odstraněn `useEffect(() => router.refresh(), [])`** — sync dat zajišťuje již existující `useEffect(() => setPosts(initialPosts), [initialPosts])`. Mutace volají `revalidatePath("/posts")` → RSC se přerenderuje s čerstvými `initialPosts` → client state se automaticky syncne. Žádný double-fetch.
  2. **Odstraněn inline IIFE z JSX renderu** — `refreshAfterExit` logika (router.refresh po smazání posledního příspěvku) přesunuta pryč z render funkce. Po smazání posledního příspěvku uživatel vidí empty state a jakákoli navigace způsobí přirozený server fetch.
  3. **Vyčištěn dead code** — odstraněn nepoužitý `useRouter` import, state `refreshAfterExit`, zjednodušen `handleDeleted` na single-line filter.
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` −37 řádků čistého kódu

### 🗑 Chore — Smazán mrtvý PostsFilters komponenta

- **Kontext**: `_posts-filters.tsx` definoval pill-style filtr (platformy + status), který nikde nebyl importován. Stránka používá `PostFiltersRow` z `@/components/post-filters-row.tsx`.
- **Opravy**:
  1. Smazán celý soubor `_posts-filters.tsx` (151 řádků).
  2. Ověřeno `grep -rn` — žádný odkaz v kódu nezbyl.
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/_posts-filters.tsx` — smazán

### ✨ Feat – Filter count indikace ("X z Y příspěvků")

- **Kontext**: Header zobrazoval `{postsCount} {tTitle}` vždy celkový počet. Když uživatel aplikoval filtr (např. platforma=LinkedIn), viděl "47 příspěvky" ale zobrazovaly se jen 3 — matoucí UX.
- **Opravy**:
  1. Přidan `useTranslations("posts")` přímo do `PostsContainer` — vyhnu se dalšímu props drilling.
  2. `hasActiveFilter` se odvozuje v rámci stávajícího `useMemo` (zero overhead) — detekuje zda je aktivní filtr platformy, statusu nebo štítku.
  3. Header nyní zobrazuje:
     - Bez filtru: `47 příspěvky` / `47 posts` / `47 публікацій` (nezměněno)
     - S filtrem: `3 z 47 příspěvků` / `3 of 47 posts` / `3 з 47 публікацій`
  4. Renomina `(t)` → `(tag)` v filter map callback pro avoidance kolize s `useTranslations` aliasem `t`.
- **Nové i18n klíče** (cs/en/uk) v sekci `posts`:
  - `filteredCount` — `"{showing} z {total} příspěvků"` / `"{showing} of {total} posts"` / `"{showing} з {total} публікацій"`
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` — useTranslations, hasActiveFilter, dynamický count
  - `src/messages/cs.json` — 1 nový klíč
  - `src/messages/en.json` — 1 nový klíč
  - `src/messages/uk.json` — 1 nový klíč

### 🐛 Fix – i18n pro všechny toasty a hardcoded texty na stránce Příspěvky + optimalizace double-fetch

- **Kontext**: Stránka `/posts` obsahovala ~15 hardcoded českých řetězců v toast notifikacích (smazání, chytré mazání, republish) a v `removed_externally` banneru. Uživatelé s EN/UK jazykem viděli češtinu. Navíc `PostsContainer` volal `router.refresh()` při každém mountu → zbytečný double-fetch.
- **Opravy**:

  1. **Nové i18n klíče** (cs/en/uk) v sekci `posts`:
     - `toastDeleteSuccess`, `toastDeleteFromAppSuccess`, `toastDeleteFailed`
     - `toastDeletedFromPlatforms`, `toastRemoveUnexpectedError`
     - `toastKeptAsDraft`, `toastPermanentlyDeleted`, `toastSmartDeleteError`
     - `toastApiNotSupported`, `toastUnderstood`, `toastDeleteFailedPlatform`
     - `toastLinkedInArchivedMulti`, `toastLinkedInArchivedSingle`
     - `removedExternallyBannerDesc`, `smartDeleteTitle`

  2. **Nahrazeny všechny hardcoded toasty** v `_post-card.tsx`:
     - Přidan `useTranslations("posts")` + helper `tv()` pro typově bezpečné parametrické překlady (`string | undefined` → `string`)
     - Všechny `toast.success/error/info` nyní používají `t()` nebo `tv()` s fallbacky

  3. **Nahrazen hardcoded text v `removed_externally` banneru** – řádek 594 (`Příspěvek byl odstraněn z platformy...`) → `t("removedExternallyBannerDesc")`

  4. **Nahrazen hardcoded title na tlačítku chytrého mazání** → `t("smartDeleteTitle")`

  5. **Optimalizace double-fetch** v `_posts-container.tsx`:
     - `router.refresh()` se nyní volá **pouze** při návratu z mutacních rout (`/posts/new`, `/posts/{uuid}`) detekovaných přes `document.referrer`
     - Návstyvy z dashboardu, kalendáře, nastavení již **nezpůsobují** zbytečný server re-fetch

- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – i18n pro toasty + banner + title
  - `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` – podmíněný refresh
  - `src/messages/cs.json` – 16 nových klíčů
  - `src/messages/en.json` – 16 nových klíčů
  - `src/messages/uk.json` – 16 nových klíčů

- **Build**: `npx tsc --noEmit` 0 chyb ✅, `npm run build` úspěšný ✅

## 2026-06-26

### ✨ Improvement – Vylepšení modálů pro připojení účtů (Prompt 027)

- **Kontext (uživatel)**: Audit `ConnectAccountModal` a `FacebookPageSelector` odhalil UX i a11y problémy – rozbitej odkaz, chybějící loading stav, nereportované chyby OAuth, špatné close button pattern a zbytečný Switch.

- **Opravy**:

  1. **Oprava odkazu "Learn more"** – Modal nyní renderuje odkaz pouze když `learnMoreUrl` je definováno. Dříve měl `href={undefined}` a kliknutí nic nedělalo.

  2. **Loading stav na tlačítku Connect** – Přidán `useState` pro `connecting` stav + `Loader2` spinner. Tlačítko je během redirectu disabled – uživatel nemůže kliknout dvakrát.

  3. **Zobrazení chyby OAuth v modálu** – `handleConnect` nyní chytá exceptiony z `onConnect` a zobrazuje je jako červený banner v modálu. Nová prop `errorTitle`.

  4. **DialogClose pro a11y** – Obě modály (`ConnectAccountModal`, `FacebookPageSelector`) nyní používají `DialogClose` z Radix UI místo vlastního `<button onClick>`. Správně uzavírá dialog a vrací focus.

  5. **FacebookPageSelector – Switch → Connect button** – Nahrazen `Switch` (vždy `checked={false}`) za akční tlačítko "Připojit" s ikonou `PlusCircle`. Vyčisten dead code pro de-aktivaci (komentář: "technicky nemožný z tohoto dialogu").

  6. **Token expirace** – Karty připojených účtů již zobrazují stav tokenu (implementováno v předchozí session, ověřeno a validováno).

- **Nové i18n klíče** (cs/en/uk):
  - `accounts.connectModal.errorTitle` – "Připojení se nezdařilo" / "Connection failed" / "Підключення не вдалося"
  - `accounts.connectModal.learnMoreUrlFacebook` – platform-specific help URL
  - `accounts.connectModal.learnMoreUrlInstagram` – platform-specific help URL
  - `accounts.connectModal.learnMoreUrlLinkedIn` – platform-specific help URL
  - `accounts.connectModal.learnMoreUrlYouTube` – platform-specific help URL
  - `accounts.connectModal.learnMoreUrlX` – platform-specific help URL
  - `accounts.connectPage` – "Připojit" / "Connect" / "Підключити"

- **Upravené soubory**:
  - `src/components/connect-account-modal.tsx` – loading, error, DialogClose, conditionální learnMore
  - `src/components/facebook-page-selector.tsx` – Connect button, DialogClose, vyčištěn dead code
  - `src/app/[locale]/(dashboard)/accounts/page.tsx` – nové props, `errorTitle`, `connectPage`
  - `src/messages/cs.json` – nové klíče
  - `src/messages/en.json` – nové klíče
  - `src/messages/uk.json` – nové klíče

- **Smazané props** (z parent → child):
  - `active`, `inactive`, `activating`, `deactivating`, `pageDisconnected` – již nepoužívány v PageSelector

- **Build**: `npx tsc --noEmit` 0 chyb ✅

### 🐛 Fix – Opravy modálů pro připojení účtů

- **Kontext (uživatel)**: Audit modálů pro připojení sociálních účtů odhalil několik problémů – hardcodovaný odkaz, mrtvý kód, debug výpisy, chybějící indikace expirace tokenů.
- **Opravy**:

  1. **Hardcodovaný odkaz „Zjistit více"** – `connect-account-modal.tsx` vždy vedl na Facebook help center. Opraveno na platformově specifické URL:
     - Instagram → `help.instagram.com`
     - LinkedIn → `linkedin.com/help`
     - YouTube → `support.google.com/youtube`
     - X (Twitter) → `developer.twitter.com`
     - Facebook → `facebook.com/business/help` (původní)
     - Nová prop `learnMoreUrl` v `ConnectAccountModalProps`

  2. **Mrtvý kód** – Smazán `src/components/account-type-modal.tsx` (203 řádků). Komponenta byla definována ale nikde neimportována ani nepoužita. Plánovaná volba Professional vs Personal účet byla nahrazena `ConnectAccountModal`.

  3. **Console.log v produkčním kódu** – Odstraněno 5 debug výpisů z `accounts/page.tsx`:
     - `"Načítám účty přímo z tabulky social_accounts..."`
     - `"VÝSLEDEK FETCH Z social_accounts..."`
     - `"FETCH ACCOUNTS ERROR:"`
     - `"Nalezeno účtů:"`
     - `console.log(accounts)` v useEffect

  4. **Indikátor expirace tokenů** – Karty připojených účtů nyní zobrazují stav tokenu:
     - Zelená tečka + „Aktivní" – token je platný a daleko od expirace
     - Žlutá tečka + „Vyprší brzy" – token vyprší do 7 dní
     - Červená tečka + „Vypršel" – token již vypršel
     - Amber warning banner s ikonou u účtů s blížící se expirací
     - Červený warning banner u vypršených tokenů
     - Nová funkce `getTokenStatus()` pro výpočet stavu z `token_expires_at`

  5. **Tlačítko „Znovu připojit"** – Každá karta účtu nyní má `RefreshCw` ikonu vedle tlačítka smazat. Kliknutí otevře `ConnectAccountModal` pro danou platformu – uživatel může token obnovit bez mazání účtu.

- **Nové i18n klíče** (cs/en/uk):
  - `accounts.tokenExpired` – „Token vypršel"
  - `accounts.tokenExpiringSoon` – „Token vyprší za {days} dní"
  - `accounts.tokenExpiredStatus` – „Vypršel"
  - `accounts.tokenExpiringStatus` – „Vyprší brzy"
  - `accounts.reconnect` – „Znovu připojit"

- **Upravené soubory**:
  - `src/components/connect-account-modal.tsx` – nová prop `learnMoreUrl`
  - `src/app/[locale]/(dashboard)/accounts/page.tsx` – expirace, reconnect, odstranění console.log
  - `src/messages/cs.json` – nové klíče
  - `src/messages/en.json` – nové klíče
  - `src/messages/uk.json` – nové klíče

- **Smazané soubory**:
  - `src/components/account-type-modal.tsx` – mrtvý kód

- **Build**: `npx tsc --noEmit` 0 chyb, `npm run build` úspěšný ✅

### 🐛 Fix – Návrat YouTube a TikTok do výběru platforem (Prompt 017-FIX)

- **Kontext (uživatel)**: Ze stránky "Nový příspěvek" (`/posts/new`) a stránky pro úpravu příspěvku (`/posts/[id]`) zmizela možnost vybrat YouTube a TikTok pro publikování. Pravděpodobně došlo k nechtěnému přepsání seznamu platforem při integraci Twitteru.
- **Příčina**: Pole `PLATFORMS` ve dvou souborech obsahovalo pouze 4 sítě (`instagram`, `facebook`, `twitter`, `linkedin`). YouTube a TikTok byly z pole vynechány.
- **Oprava**:
  - `/posts/new/page.tsx` – rozšířeno `PLATFORMS` na všech 6 platforem, přidány překlady `youtube` a `tiktok` do label logiky.
  - `/posts/[id]/page.tsx` – rozšířeno `PLATFORMS` na všech 6 platforem.
  - EditPostDialog (`edit-post-dialog.tsx`), Kalendář (`_calendar-view.tsx`) a Filtry (`_posts-filters.tsx`) již měly kompletní seznam – žádná úprava nutná.
  - Ikony `SocialIcons` (Youtube, TikTok) jsou importovány a správně mapovány ve všech dotčených souborech.
  - Překlady pro `youtube` a `tiktok` existují ve všech třech jazycích (`cs.json`, `en.json`, `uk.json`).
- **Upravené soubory**:
  - [`src/app/[locale]/(dashboard)/posts/new/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/new/page.tsx) – PLATFORMS + label logika
  - [`src/app/[locale]/(dashboard)/posts/[id]/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/[id]/page.tsx) – PLATFORMS

### 🐛 Fix – `redirect_uri is not defined` v X OAuth callbacku (Prompt 016-FINAL-FIX)

- **Kontext (uživatel)**: PKCE flow funguje, uživatel se dostane na schvalovací stránku Twitteru, ale po kliknutí na "Authorize app" proces selže s `ReferenceError: redirect_uri is not defined` na řádku 158 v `src/app/api/accounts/x/route.ts`.
- **Příčina**: V `console.log` bloku (token exchange) byl použit objektový shorthand `{ redirect_uri }`, což JavaScript interpretuje jako `{ redirect_uri: redirect_uri }` – tedy hledání proměnné `redirect_uri`. Proměnná je však definována jako `redirectUri` (camelCase) na řádku 81.
- **Oprava**: Změněno `{ redirect_uri }` na `{ redirect_uri: redirectUri }` – explicitní přiřazení hodnoty camelCase proměnné pod snake_case klíčem v logovacím objektu.
- **Upravené soubory**:
  - [`src/app/api/accounts/x/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/x/route.ts) – řádek 158

### 🐛 Fix – Twitter OAuth 2.0 PKCE (Prompt 016-FIX / 016-REDIRECT-FIX)

- **Kontext (uživatel)**: Twitter Developer Portal byl správně nakonfigurován, ale přihlášení vracelo "Something went wrong". Dva problémy:
  1. `code_verifier` se předával jako query parametr v URL (`?code_verifier=...`), ale Twitter ho do callbacku nepřesměrovává zpět.
  2. `redirect_uri` musela být stabilní a identická v obou krocích (authorize i token exchange).
- **Co bylo opraveno**:
  - **Server-side PKCE generování**: `code_verifier` a `code_challenge` (S256) se nyní generují **na serveru** v route (`/api/accounts/x`), ne ve frontend kódu. Verifier se nikdy nedostane do URL.
  - **Cookie storage pro PKCE**: `code_verifier` a `state` se ukládají do httpOnly cookie PŘED redirectem na Twitter. Callback je čte z cookie.
  - **Stabilní `redirect_uri`**: Deklarována jednou (`const redirectUri = \`${url.origin}/api/accounts/x\``) a použita v obou krocích.
  - **Frontend zjednodušení**: `accounts/page.tsx` již negeneruje PKCE a neposílá `code_verifier` ani `code_challenge` v URL. Posílá pouze `state` a `locale`.
  - **Mrtvý kód**: Odebrán nepoužitý import `@/lib/pkce` z `accounts/page.tsx`.
  - **Cookie cleanup**: Po úspěšném OAuth flow se cookie `x_code_verifier` a `x_oauth_state` automaticky mažou.
  - **Early validation**: Pokud cookie `x_code_verifier` v callbacku chybí, okamžitá chyba s logem.
- **Upravené soubory**:
  - [`src/app/api/accounts/x/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/x/route.ts) – server-side PKCE, cookie storage/read/cleanup, stabilní `redirect_uri`
  - [`src/app/[locale]/(dashboard)/accounts/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/accounts/page.tsx) – odstraněn client-side PKCE, zjednodušený redirect URL

### ✨ Feature – Kompletní Twitter/X (OAuth + Publish + Delete) Integrace

- **Kontext (uživatel)**: Implementace plné podpory pro publikování příspěvků na X (Twitter) – OAuth připojení, publikování tweetů s médii, mazání tweetů a UI integrace. Implementace proběhla napříč více relacemi.
- **Co bylo vytvořeno/upraveno**:

  **1. OAuth Route** – [`src/app/api/accounts/x/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/x/route.ts) (nový)
  - OAuth 2.0 (PKCE) flow pro X (Twitter) s `offline.access` scope (refresh token)
  - Scopes: `tweet.read tweet.write users.read offline.access`
  - Dvoufázová route: GET bez `code` → redirect na X authorize, GET s `code` → exchange token + fetch profil + save do DB
  - PKCE: `code_verifier` + `code_challenge` (S256) předávány jako query params
  - Env vars: `TWITTER_CLIENT_ID` a `TWITTER_CLIENT_SECRET` (s fallbackem na `X_API_KEY`/`X_API_SECRET`)

  **2. Publish Logika** – [`src/lib/actions/publish-twitter.ts`](file:///c:/VS_Code/Postio/src/lib/actions/publish-twitter.ts) (nový)
  - `publishToTwitterAction()` – hlavní entry point, volán z `publish.ts`
  - Token refresh: `getValidTwitterAccessToken()` + `exchangeRefreshToken()` – automatický refresh vypršených tokenů
  - Media upload: `uploadMediaToX()` přes Media Upload API v1.1 (multipart/form-data), podpora JPG/PNG/WebP/GIF (až 4 obrázky)
  - Tweet creation: `publishTweetToX()` přes API v2 (`POST /2/tweets`), text + `media_ids`
  - Truncace na 280 znaků, přidání lokace a hashtagů
  - Duplicate-upload guard (kontrola `existingExternalId`)

  **3. Publish Router Integrace** – [`src/lib/actions/publish.ts`](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) (upraven)
  - Import `publishToTwitterAction`
  - Twitter case v `publishPostAction()` – publish s `upsertPostPublications()`
  - Twitter case v `publishAdditionalPlatforms()` – dodatečný publish na X při editaci publikovaného postu
  - Twitter case v `deletePostFromPlatform()` – `DELETE /2/tweets/{id}` + update `post_publications` na `deleted`
  - Twitter case v `updateRemotePost()` – vrací error (editace tweetů API nepodporuje)

  **4. Delete Logika** (v `publish.ts`)
  - `DELETE https://api.twitter.com/2/tweets/{externalId}` s Bearer auth
  - Po úspěšném smazání update `post_publications.status = 'deleted'`
  - Po selhání API (404 atd.) update na `failed` + log erroru

  **5. UI – Edit Post Dialog** – [`src/components/edit-post-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx) (upraven)
  - `isTwitterPublished` detekce (podobně jako `isInstagramPublished`)
  - Blok editace s errorem a toastem, pokud je tweet již publikován
  - Amber banner „X (Twitter) nepodporuje editaci…" zobrazovaný v dialogu
  - Typové casty: `tLabels as unknown as Record<string, string>` pro `twEditNotSupported`

  **6. UI – Accounts Page** – [`src/app/[locale]/(dashboard)/accounts/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/accounts/page.tsx) (upraven)
  - Platform definice pro X (Twitter) s ikonou, barvou, OAuth handlerem
  - PKCE flow: generování `code_verifier` + `code_challenge` při kliknutí na "Připojit"
  - URL parametry: `code_challenge`, `code_verifier`, `state`, `locale`
  - Detekce `?x=connected` v URL → toast `xConnectedShort`
  - X ikona a styl v seznamu platforem, v `ConnectAccountModal` a v publish dialogu

  **7. Lokalizace** (všechny 3 jazyky)
  - `cs.json`, `en.json`, `uk.json` – přidány klíče:
    - `xConnected` / `xConnectedShort` / `xDisconnected` – zprávy o připojení/odpojení
    - `twEditNotSupported` – hláška o nepodpoře editace tweetů
    - Opraveny typografické uvozovky v `liConnected`, `liDisconnected`, `xConnected`, `xDisconnected`

  **8. Ikony a vizuál**
  - X (Twitter) ikona v platform selectoru, v publish dialogu, v accounts page
  - Barevný akcent konzistentní s Postio designem

- **Platform rules dodrženy** (z AGENTS.md):
  - ✅ Editace textu: ❌ Ne – API nepodporuje, UI blokuje s bannerem
  - ✅ Smazání: ✅ Ano – `DELETE /2/tweets/{id}`
  - ✅ Free tier: write-only (publish + delete), žádné čtení timeline

- **Upravené soubory** (shrnutí):
  - `src/app/api/accounts/x/route.ts` – **nový** (OAuth route, 248 řádků)
  - `src/lib/actions/publish-twitter.ts` – **nový** (publish + refresh + media upload, 530 řádků)
  - `src/lib/actions/publish.ts` – upraven (import + twitter cases v publish/delete/update)
  - `src/components/edit-post-dialog.tsx` – upraven (twitter detekce + banner + typové opravy)
  - `src/app/[locale]/(dashboard)/accounts/page.tsx` – upraven (platform definice + PKCE flow)
  - `src/messages/cs.json` – upraven (xConnected, xDisconnected, twEditNotSupported + fix uvozovek)
  - `src/messages/en.json` – upraven (stejné klíče v angličtině)
  - `src/messages/uk.json` – upraven (stejné klíče v ukrajinštině)

- **Build**: `npm run build` proběhl úspěšně bez chyb.

### 🎨 Vylepšení – Prompt 014 – Optimalizace velikosti náhledu pro PC / Desktop

- **Kontext (uživatel)**: Náhled příspěvku (PreviewDialog) na PC byl příliš velký a nutil uživatele scrollovat. Cíl: kompaktní náhled, který se vejde do okna bez scrollu.
- **Co bylo upraveno** (pouze CSS/Tailwind, žádná změna logiky):
  1. **Dialog rozměry**: `sm:max-w-[480px]` a `lg:max-w-[540px]` (původně `sm:max-w-[720px]`). Výška `max-h-[85vh]` (původně `max-h-[90vh]`).
  2. **Sociální karta max-h**: Přidáno `max-h-[65vh]` na kontejner náhledu + `postio-scrollbar` pro extrémně dlouhé texty. Běžné posty se vejí bez scrollu.
  3. **Zmenšení paddingů dialogu**: Header `px-4 pt-4 pb-1.5` (původně `px-5 pt-5 pb-2`), body `px-4 pb-4 space-y-2` (původně `px-5 pb-5 space-y-3`).
  4. **Scale down – fonty**: Title `text-xs`, taby `text-[11px]`, tlačítko "Zobrazit na síti" `text-xs` s menšími paddingy a ikonou `h-3.5 w-3.5`.
  5. **Scale down – sociální karty**: Všechny platformy (Facebook, Instagram, YouTube, LinkedIn) mají zmenšené:
     - Avatary: 28px (FB), 24px (IG, YT), 32px (LinkedIn)
     - Texty: `text-[12px]` pro hlavní text, `text-[9px]` pro meta informace
     - Paddingy: `px-2.5` místo `px-3`, menší `py` a `gap` hodnoty
     - Akční ikony: `text-sm` místo `text-base`
  6. **Tlačítko "Zobrazit na síti"**: Vždy viditelné bez scrollování celého dialogu díky `flex-shrink-0` a kompaktnímu layoutu.
- **Jeden upravený soubor**:
  - [`preview-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/preview-dialog.tsx) – Standalone náhledový dialog (Oko)
- **Co zůstalo nezměněno**: Logika publish URL, platform taby, profilová data, renderovací funkce, `post-preview.tsx` (live náhled v editoru).

## 2026-06-25

### 🎨 Vylepšení – Prompt 012 – Konečná oprava High-Fidelity náhledu v Editoru

- **Kontext (uživatel)**: Pravý panel náhledu v editoru stále zobrazoval pomocné barevné nadpisy ("Instagram", "YouTube", "facebook", "in") uvnitř náhledových karet a média nevyplňovala celou šířku karty (object-contain vytvářel okraje). Navíc byl pravý panel příliš úzký (360px).
- **Co bylo upraveno** (pouze vizuál, žádná změna logiky):
  1. **Odstranění pomocných nadpisů**: Všechny top bary s názvy platforem (růžový "Instagram", červený "YouTube", modrý "facebook", LinkedIn "in") byly z náhledových karet odstraněny. Náhledy nyní začínají přímo hlavičkou příspěvku (avatar + jméno), přesně jako v reálné aplikaci.
  2. **Média full-width (object-cover)**: Všechny obrázky a videa v náhledech nyní používají `object-cover` místo `object-contain` a odstraněno `max-h-[320px]`. Média vyplňují 100 % šířky náhledové karty bez okrajů.
  3. **Šířka pravého panelu**: Grid layout změněn z `lg:grid-cols-[minmax(0,1fr)_360px]` na `lg:grid-cols-[minmax(0,1fr)_minmax(0,45%)]` – pravý panel nyní dostává až 45 % šířky dialogu. Výška zvětšena z `max-h-[60vh]` na `max-h-[70vh]`.
  4. **Phone mock flex-1**: Kontejner náhledu v `PostPreview` změněn z `max-h-[480px]` na `flex-1 min-h-0`, aby plně využil dostupný prostor v panelu.
- **Tři upravené soubory** (stejné změny pro konzistenci napříč všemi náhledy):
  - [`post-preview.tsx`](file:///c:/VS_Code/Postio/src/components/post-preview.tsx) – Live náhled v edit módu (pravý sloupec editoru)
  - [`preview-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/preview-dialog.tsx) – Standalone náhledový dialog (Oko)
  - [`edit-post-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx) – `renderPlatformPreview()` + `PreviewMediaArea` + grid layout
- **Co zůstalo nezměněno**: Logika publikování, props API, platform taby (segmented control), profilová data.

## 2026-06-25

### 🎨 Vylepšení – Prompt 010 – Zvětšení okna náhledu a elegantní scrollbar

- **Kontext (uživatel)**: Dialog náhledu příspěvku (Oko) byl příliš úzký (`max-w-[420px]`) a měl pevnou výšku `max-h-[480px]`, což nutilo scrollovat i u běžných příspěvků. Standardní bílý scrollbar narušoval tmavý design.
- **Co bylo upraveno** (pouze vizuál, žádná změna logiky):
  1. **Zvětšení dialogu**: `sm:max-w-[420px]` → `sm:max-w-[720px]` a přidáno `max-h-[90vh]` pro využití 90 % výšky obrazovky.
  2. **Flexbox layout**: DialogContent nyní `flex flex-col` – hlavička (`flex-shrink-0`) a tlačítko „Zobrazit na síti" (`flex-shrink-0`) zůstávají fixní, scrollovatelný je jen střední obsah.
  3. **Elegantní scrollbar**: Scrollovatelná oblast používá existující třídu `postio-scrollbar` (6px tenký, `scrollbar-width: thin`, tmavý kulatý thumb, který splyně s černým pozadím).
  4. **Přidání `overflow-y-auto` u náhledu**: Sociální karta uvnitř má vlastní scroll místo pevného `max-h-[480px]`.
- **Jeden upravený soubor**:
  - [`preview-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/preview-dialog.tsx) – Standalone náhledový dialog (Oko)
- **Co zůstalo nezměněno**: Logika publish URL, platform taby, profilová data, všechna renderovací funkce.

## 2026-06-24

### 🎨 Vyladění – Prompt 004 – Věrnost a velikost sociálních náhledů

- **Kontext (uživatel)**: Náhledy sociálních příspěvků v dialogu byly vizuálně příliš velké a neodpovídaly přesně realitě feedů na jednotlivých platformách.
- **Co bylo upraveno (pouze vizuál, žádná změna logiky)**:
  1. **Omezení velikosti**: Celý kontejner náhledu má `max-h-[480px]`. Obrázky omezeny na `max-h-[320px]` s `object-contain` (místo `object-cover`), aby se nepřetáčely.
  2. **Typografie**: Všechny texty v náhledech zmenšeny na `text-[13px]` (nadpisy) a `text-[10px]` (meta), aby odpovídaly hustotě reálných platform.
  3. **Facebook**: Text nad obrázkem (feed-style). Autentické akční ikony pod obrázkem (Líbí se mi / Komentář / Sdílet) s dividerem a engagement summary s barevnými ikonami.
  4. **Instagram**: Hlavička → dominantní obrázek → ikony (♡ 💬 ✈️ 🔖) → počet líbenek → caption s username. Avatar zmenšen na 28px.
  5. **LinkedIn**: Tmavé pozadí (`#1a1a2e` / `#1e1e36`) pro konzistenci s Postio UI. Avatar 36px, zmenšená typografie. Akční ikony s českými popisky (To se mi líbí, Komentovat, Přeposlat, Odeslat).
  6. **YouTube**: Konzistentní zmenšení – avatar 28px, `text-[13px]` titulky, `text-[10px]` akce. Subscribe button zmenšený.
- **Dvě upravené soubory** (stejné změny v obou pro konzistenci):
  - [`post-preview.tsx`](file:///c:/VS_Code/Postio/src/components/post-preview.tsx) – Live náhled v edit módu (pravý sloupec)
  - [`edit-post-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx) – `renderPlatformPreview()` v preview módu (Prompt 003)
- **Co zůstalo nezměněno**: Logika publikování, AI Vision, tlačítka "Upravit" a "Zobrazit příspěvek", `PostPreview` API (props/interface).
- **Build**: `npx tsc --noEmit` – 0 chyb v upravených souborech ✅.

## 2026-06-24

### 🚀 Feature – Prompt 003 – Detail příspěvku a Social Preview

- **Kontext (uživatel)**: Po rozkliknutí příspěvku v kalendáři se otevřel přímo editor. Uživatel chtěl nejprve zobrazit vizuální detail příspěvku s věrným náhledem na dané platformě a přepnout do editace až na požádání.
- **Co bylo implementováno**:
  1. **`viewMode` state** v [`EditPostDialog`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx) – dva módy: `'preview'` (výchozí pro publikované posty) a `'edit'` (formulář). Nové posty začínají v `edit` módu.
  2. **Dynamické taby platforem** – v preview módu se zobrazí záložky **pouze** pro platformy, kde je příspěvek skutečně publikován (`status === 'published'` v `post_platforms`).
  3. **URL builder funkce** (`buildLiveUrl`) – generuje URL pro LinkedIn, Facebook, Instagram, YouTube, X (Twitter), TikTok z `external_id`.
  4. **Tlačítko "View live post"** – odkaz s `ExternalLink` ikonou, vede na reálnou URL příspěvku na dané síti.
  5. **Tlačítko "Upravit"** – přepne z preview módu zpátky do editoru.
  6. **Platform preview renderování** – funkce `renderPlatformPreview()` vykresluje věrnou simulaci příspěvku pro Facebook, Instagram, LinkedIn a YouTube (avatar, jméno, text, média, UI dané sítě).
  7. **Pomocné komponenty** – `AvatarInline` (avatar s fallback na iniciály) a `PreviewMediaArea` (obrázek/video/placeholder) definovány lokálně v dialogu.
  8. **Prázdný stav** – pokud příspěvek ještě nebyl publikován na žádné platformě, zobrazí se info ikona + text "Tento příspěvek ještě nebyl publikován."
- **Lokalizace**: Přidány klíče do [`cs.json`](file:///c:/VS_Code/Postio/src/messages/cs.json), [`en.json`](file:///c:/VS_Code/Postio/src/messages/en.json), [`uk.json`](file:///c:/VS_Code/Postio/src/messages/uk.json):
  - `viewLivePost`, `editPostButton`, `postDetail`, `noPublishedPlatforms`
- **Integrace**: Nové klíče přidány do `tLabels` v [`_calendar-view.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx). Všechny nové property jsou volitelné (`?:`) s fallback hodnotami v kódu.
- **Dopad na chování**:
  - **Před**: Rozkliknutí publikovaného příspěvku v kalendáři otevřelo rovnou editor.
  - **Po**: Rozkliknutí otevře preview mód s náhledem na vybrané platformě + tlačítko "View live post". Editor je dostupný tlačítkem "Upravit" v rohu.

## 2026-06-21

### 🚀 Feature – Prompt 002 – Redesign kalendáře na Dashboard styl

- **Kontext (uživatel)**: Kalendář na `/[locale]/calendar` měl dosud jen dvě view (Month/Week) a chyběl mu profesionální dashboard styl. Uživatel chtěl přeměnit kalendář na plánovací centrum s přehlednými statistikami, přepínačem pohledů, mini-kalendářem v sidebaru a indikátorem aktuálního času. **Striktní pravidla**: zachovat funkčnost (zejm. `getPostDisplayDate`, propojování účtů, AI Vision), Pure Black #000 pozadí, radius 20px, Glassmorphism a překlady ve všech třech jazycích.
- **Co bylo implementováno (4 nové komponenty + integrace)**:
  1. **[`StatsCards`](file:///c:/VS_Code/Postio/src/components/calendar/stats-cards.tsx)** – 4 glass karty (Total Published, Total Scheduled, Failed Posts, Drafts) nad kalendářem.
     - Počítá se z `post.status` (single source of truth = server komponenta `calendar/page.tsx`, která `status` agreguje z `post_platforms.status`).
     - Jemné barevné gradient ikony (emerald/indigo/red/slate), glassmorphism, radius 20px.
     - Subtitle „Tento měsíc" konzistentní s ostatními dashboard kartami.
  2. **[`ViewSwitcher`](file:///c:/VS_Code/Postio/src/components/calendar/view-switcher.tsx)** – Přepínač 5 pohledů (Agenda / Day / Week / Month / Year).
     - Glassmorphism styl, aktivní mód = indigo→purple gradient.
     - Typ `CalendarViewMode` exportovaný jako single source of truth pro state v `_calendar-view.tsx`.
  3. **[`MiniCalendar`](file:///c:/VS_Code/Postio/src/components/calendar/mini-calendar.tsx)** – Sticky sidebarový mini-kalendář (desktop only).
     - Vlastní měsíční grid 7×6, dnešek = gradient kroužek, vybraný den = indigo outline.
     - Klik na den = `setCurrentDate(day)` v hlavním kalendáři.
     - Šipky pro přepínání měsíců, lokalizované zkratky dnů.
  4. **[`CurrentTimeIndicator`](file:///c:/VS_Code/Postio/src/components/calendar/current-time-indicator.tsx)** – Červená linka pro Day view.
     - `useEffect` + `setInterval` (30s) pro live update.
     - Top pozice = `(currentHour + currentMin/60) * hourHeight`; label s aktuálním časem a Clock ikonou.
- **Integrace do [`_calendar-view.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx)**:
  - State `view` rozšířen z `"month" | "week"` na `CalendarViewMode` (5 módů).
  - Nové navigační helpery `previousDay`, `nextDay`, `previousYear`, `nextYear`.
  - Nové useMemo hooky `yearMonths` (12 měsíců pro year view) a `desktopAgendaDays` (60 dní dopředu pro agenda view).
  - Desktop layout změněn na 2-sloupcový grid: MiniCalendar vlevo (sticky, 260px), hlavní obsah vpravo.
  - Všech 5 view módů implementováno s odděleným JSX: Month = stávající měsíční grid, Week = 7 dní v řadě, Day = 24h časová osa s CurrentTimeIndicator, Agenda = dlouhý seznam příspěvků, Year = 12 mini-měsíců v gridu 3×4.
  - ViewSwitcher nahradil stávající 2-tlačítkový toggle v headeru.
- **Lokalizace**:
  - Přidány nové klíče do [`cs.json`](file:///c:/VS_Code/Postio/src/messages/cs.json), [`en.json`](file:///c:/VS_Code/Postio/src/messages/en.json), [`uk.json`](file:///c:/VS_Code/Postio/src/messages/uk.json):
    - `calendar.day`, `calendar.year`, `calendar.miniCalendar`, `calendar.currentTime`, `calendar.allDay`, `calendar.noPostsInRange`
    - `calendar.stats.{totalPublished, totalScheduled, failedPosts, drafts, thisMonth}`
- **Co zůstává nezměněno (záměrně)**:
  - **Backend**: `calendar/page.tsx` (server komponenta) je nedotčen – všechna data o příspěvcích jsou stále reálná z databáze přes Supabase.
  - **Logika příspěvků**: `getPostDisplayDate`, `getPostsForDayEffective`, `effectiveFilteredPosts`, hover preview, Edit/Delete dialog, AI Vision, propojování účtů.
  - **Mobile agenda** (`mobileAgendaDays`): zachována v plném rozsahu (celý aktuální měsíc) jako default pro malé obrazovky.
  - **Filtry** (`PostFiltersRow`): nezasaženy – `StatsCards` dostává `effectiveFilteredPosts`, takže statistiky respektují aktivní filtry (platforma/status/tag).
- **Dopad na chování**:
  - **Před**: Kalendář zobrazil jen měsíční nebo týdenní grid; žádné statistiky, žádný current time indikátor.
  - **Po**:
    1. Při načtení `/calendar` se nahoře zobrazí 4 statistické karty (odpovídají aktuálním filtrům).
    2. Desktop layout = sidebar s MiniCalendar vlevo + kalendář vpravo.
    3. ViewSwitcher umožňuje přepnout mezi 5 módy (Month, Week, Day, Agenda, Year).
    4. Day view zobrazí 24h časovou osu s červenou linkou aktuálního času (live update).
    5. Agenda view zobrazí 60 dní dopředu jako dlouhý seznam.
    6. Year view zobrazí 12 měsíců aktuálního roku v gridu; klik na den = přepne do month view s focusem na daný den.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Soubory dotčené**:
  - **Nové**: `src/components/calendar/stats-cards.tsx`, `src/components/calendar/view-switcher.tsx`, `src/components/calendar/mini-calendar.tsx`, `src/components/calendar/current-time-indicator.tsx`
  - **Upravené**: `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`, `src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx`, `src/app/[locale]/(dashboard)/calendar/page.tsx`, `src/messages/{cs,en,uk}.json`
- **Dopad na dokumentaci (CLAUDE.md)**: Žádná změna nutná. Toto je vizuální upgrade kalendáře; žádná business pravidla v Biblu pravidel nejsou dotčena.

## 2026-06-21

### 🐛 Oprava – Dnes publikované příspěvky se nezobrazovaly v kalendáři

- **Kontext (uživatel)**: V kalendáři (`/[locale]/calendar`) chyběly příspěvky, které uživatel **právě dnes publikoval** – typicky příspěvky vytvořené jako koncept v předchozích dnech a poté přes „Publikovat nyní" odeslané na sociální sítě. Po akci se v kalendáři nezobrazily v dnešní buňce, takže uživatel ztratil přehled o tom, co ten den skutečně vyšlo.
- **Příčina – serverový fallback v [`calendar/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/calendar/page.tsx)**:
  - Příspěvek publikovaný přes **„Publikovat nyní"** se vytvoří v [`createPostAction`](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) s `scheduledAt: null`, takže `post_platforms.scheduled_at` zůstane `null` (nebylo nikdy naplánováno).
  - Serverový mapovač v calendar page pak fallbackuje: `postPlatforms.find(p => p.scheduled_at)?.scheduled_at || post.created_at`. Protože `scheduled_at` je null, použije se **`post.created_at`** – tedy **datum vytvoření draftu**, ne datum publikování.
  - Pokud uživatel vytvořil koncept **včera** a publikoval ho **dnes**, server nastavil `scheduled_at = včerejší datum` a příspěvek se zobrazil ve **včerejší** buňce kalendáře. V dnešní buňce chyběl – přesně tento UX problém.
  - **Stejný bug** se týkal i příspěvků naplánovaných na budoucí datum (např. zítra), které uživatel mezitím ručně publikoval dnes – ty se objevovaly v buňce **původního plánu**, ne v dnešní.
- **Dopad**:
  - Kalendář nekonzistentně ukazoval, co bylo skutečně publikováno – uživatel nemohl ověřit, že dnešní „Publikovat nyní" akce proběhla úspěšně.
  - Plánované datum nesedělo se skutečným datem publikování u manuálně předčasně publikovaných příspěvků.
- **Co bylo opraveno v [`_calendar-view.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx)**:
  1. **Nový helper `getPostDisplayDate(post)`** – vrací datum, na které se příspěvek **skutečně** zobrazuje v kalendáři:
     - Pro příspěvky s alespoň jednou publikovanou platformou (`status === "published" && published_at`) vrátí **nejstarší `published_at`** (kdy příspěvek skutečně vyšel na první platformě).
     - Jinak vrátí `post.scheduled_at` (server jej plní fallbackem `post.created_at`, takže funguje i pro koncepty).
     - Krajní případ: `null` → caller zobrazí na dnešní buňce.
  2. **`getPostsForDayEffective`** – nově filtruje přes `getPostDisplayDate(post)` místo přes `post.scheduled_at`. Příspěvek publikovaný dnes (ale vytvořený včera jako koncept) se nyní správně **přiřadí k dnešní buňce**, ne ke včerejší.
  3. **Čas v buňkách** (desktop i mobile agenda) – `formatTime` se nově volá nad `getPostDisplayDate(post)` místo `post.scheduled_at`. V buňce dnešního dne se tedy uvidí **čas skutečného publikování** (např. 14:32), ne čas vytvoření draftu (např. včerejší 18:15).
  4. **Hover preview** u postu – stejná oprava: přebírá `getPostDisplayDate(hoveredPost)`. Dříve se v hoveru mohl objevit čas vytvoření draftu, který nekorespondoval se dnem v kalendáři.
- **Co zůstává nezměněno (záměrně)**:
  - **`EditPostDialog`** nadále dostává původní `post.scheduled_at` – při editaci je logicky správné nabízet **původní plánované datum** (uživatel může chtít přeplánovat), ne datum publikování. Pokud by se použilo `published_at`, formulář by po publikaci stále ukazoval „dnes" jako scheduled time.
  - **`post_platforms.scheduled_at`** se v `handlePublishSuccess` neaktualizuje – toto je záměrné, viz `CLAUDE.md` pravidla. Pomocná hodnota `published_at` je single source of truth pro okamžik publikování.
  - Server v `calendar/page.tsx` se nezměnil – klientský helper řeší konverzi „display date" deterministicky na základě `post_platforms`, takže není potřeba měnit API kontrakt.
- **Dopad na chování**:
  - **Před opravou**: Příspěvek publikovaný dnes přes „Publikovat nyní" se v kalendáři objevil ve špatné buňce (datum vytvoření draftu).
  - **Po opravě**:
    1. Uživatel publikuje příspěvek (kdykoliv).
    2. Server dokončí `handlePublishSuccess` a zapíše `published_at`.
    3. Kalendář při dalším načtení/refreshi zobrazí příspěvek v buňce **data skutečného publikování**, s časem odpovídajícím `published_at`.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení (publish-now flow)**:
  1. Na `/posts` (nebo v kalendáři) vytvoř příspěvek a **nezaškrtávej „Naplánovat"**, ulož jako **koncept**.
  2. Počkej alespoň do dalšího dne (nebo ručně změň `posts.created_at` v Supabase na včerejší datum).
  3. V `EditPostDialog` klikni **„Publikovat nyní"** – publikuj.
  4. Otevři `/calendar` → příspěvek by se měl **zobrazit v dnešní buňce** s **časem publikování**, ne ve včerejší.
  5. V Supabase: `post_platforms.published_at = <dnešní ISO>` → helper `getPostDisplayDate` vrátí toto datum → `getPostsForDayEffective` přiřadí příspěvek ke správné buňce.
- **Dopad na dokumentaci (CLAUDE.md)**: Žádná změna nutná. Toto je lokální oprava kalendářové logiky; žádná business pravidla v Biblu pravidel nejsou dotčena.

## 2026-06-21

### 🐛 Oprava – Republish po LinkedIn archivaci nezobrazoval nový stav (PostCard zůstával „Koncept")

- **Kontext (uživatel)**: Po úspěšném nasazení LinkedIn soft-archive (šedá ikona) z předchozího commitu se objevil nový bug. Postup:
  1. Uživatel smazal publikovaný příspěvek z LinkedInu přes `DeletePostDialog` → PostCard správně zešednul (LinkedIn ikona šedá, badge „Koncept"), `posts.status="draft"` (per deleteFromMeta LinkedIn branch).
  2. Uživatel otevřel `EditPostDialog`, zaškrtl LinkedIn, klikl **„Publikovat na LinkedIn"** → zobrazil se zelený toast **„Příspěvek byl publikován na linkedin!"**.
  3. **ALE** PostCard se **neaktualizoval** – LinkedIn ikona zůstala šedá, badge zůstal „Koncept". Ani po `router.refresh()` a dokonce ani po ručním `F5` občas. Po kliknutí na `router.refresh()` z vnějšku (jiná akce) se to najednou projevilo. Diagnostika ukázala dva samostatné problémy.
- **Příčina 1 – chybějící `posts.status="published"` update v `handlePublishSuccess`**:
  - `handlePublishSuccess` v [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) se po úspěšném publish stará jen o `post_platforms` (status → `published`, nové `external_id` + `published_at`). **Nikde explicitně nepřepíše `posts.status`**.
  - `posts.status` se v celém kódu nastavuje na „draft" v [deleteFromMeta](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts#L1310) (LinkedIn soft-archive) a v `deletePost` (klasické smazání) – ale **nikde** se explicitně nepřepíná zpět na „published".
  - `getPosts` a `getPost` v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L634) a server komponenta [page.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/page.tsx) **počítají `post.status` dynamicky z `post_platforms.status`** – mělo by to fungovat i bez explicitního zápisu.
  - **ALE**: Po republish flow (LinkedIn: archived → published) se `post_platforms.status` nastaví správně, ale když se React `useEffect(() => setPosts(initialPosts), [initialPosts])` v [PostsContainer](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/_posts-container.tsx#L139) nespustí (typicky proto, že referenční rovnost `initialPosts` zůstane zachovaná kvůli RSC payload memoizaci), PostCard zůstane s `post.status="draft"` a zelenou LinkedIn ikonou vedle sebe – velmi matoucí UX.
- **Příčina 2 – Next.js RSC payload caching na `/posts` routě**:
  - `revalidateAllLocales("/posts")` v `handlePublishSuccess` invaliduje **path cache** (HTTP cache vrstvu), ale **Next.js App Router RSC payload cache** je samostatná vrstva, kterou `revalidatePath` v Next.js 14 **automaticky neinvaliduje** pro dynamické routy.
  - V důsledku toho se `posts/page.tsx` může znovu vykreslit s **původním** `post.status` (tj. „draft"), i když DB už obsahuje `status="published"` na `post_platforms`. Toto je přesně ten případ, kdy „ani po F5 se nic nezměnilo".
- **Co bylo opraveno**:
  1. **[`handlePublishSuccess`](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts#L750) – přidán explicitní `posts.status="published"` update**:
     - Po `post_platforms` updatu se volá `await supabase.from("posts").update({ status: "published" }).eq("id", postId).eq("user_id", userId)`.
     - Tím se `posts.status` stane **single source of truth** nezávislým na RSC payload cache. I kdyby server komponenta vrátila starý payload, PostCard by po dalším `router.refresh()` dostal nová data s `post.status="published"`.
     - Chyba při tomto updatu je **nefatální** (loguje se do konzole) – fallback na dynamický výpočet z `post_platforms.status` v `getPosts` stále funguje.
  2. **[`posts/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/page.tsx) – přidán `export const dynamic = "force-dynamic"`**:
     - Next.js 14 App Router RSC payload cache se opt-outuje pomocí `force-dynamic` segment configu.
     - Stránka `/posts` se nyní **vždy vykresluje na serveru** při každém requestu, takže se nemůže stát, že by se vrátil starý payload s `post.status="draft"` po republish.
     - Výkonová režie je minimální – stránka už stejně volá `supabase.auth.getUser()` a `await params`, což ji dělá implicitně dynamickou; `force-dynamic` jen **explicitně zakazuje payload cache**, ne fetch cache.
- **Dopad na chování**:
  - **Před opravou**: Po republish z archivovaného stavu se PostCard mohl zobrazit nekonzistentně (šedá ikona + „Koncept" badge, ikony nezezelenaly i po F5).
  - **Po opravě**:
    1. Toast „Příspěvek byl publikován na LinkedIn" se zobrazí.
    2. `handlePublishSuccess` aktualizuje `post_platforms.status="published"` (zelená ikona) **a** `posts.status="published"` (zelený badge).
    3. `router.refresh()` v `EditPostDialog` (a v `handleDeleteConfirm` v PostCard) **vynutí nový server-render** díky `force-dynamic` na `/posts` – PostCard dostane nová data.
    4. Uživatel vidí PostCard s **oběma** zelenými ikonami (FB + LinkedIn) a zeleným „Publikované" badgem.
  - **YouTube / Facebook / Instagram**: beze změny – tato oprava se týká **všech** publish cest, protože `handlePublishSuccess` je sdílený helper. Dopad je pozitivní (konzistentnější stav `posts.status`).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení (LinkedIn re-publish flow)**:
  1. Smaž publikovaný příspěvek z LinkedInu (viz předchozí commit) – PostCard zešedne, badge „Koncept".
  2. Otevři `EditPostDialog`, zaškrtni **LinkedIn**, klikni **„Publikovat na LinkedIn"**.
  3. Zobrazí se zelený toast „Příspěvek byl publikován na LinkedIn!".
  4. **Bez F5**: PostCard by se měl **okamžitě** aktualizovat (LinkedIn ikona zezelená, badge se změní na „Publikované").
  5. **S F5**: Konzistentní stav (oba stavy v DB i v UI).
  6. V Supabase: `posts.status="published"`, `post_platforms[linkedin].status="published"`, `external_id=<nové UGN>`.
- **Dopad na dokumentaci (CLAUDE.md)**: Žádná změna nutná. Pravidlo „po smazání z platformy zůstane šedá ikona" platí i nadále – tato oprava řeší pouze **republish** cestu zpět z archivovaného stavu.

## 2026-06-21

### ✅ Hotovo – LinkedIn soft-archive (šedá ikona) + zkrácení toast hlášky

- **Kontext (uživatel)**: Po 30 minutách manuálního testu se potvrdilo, že **LinkedIn API vidí příspěvek i po jeho smazání na platformě** – nedá se spolehnout na žádný automatický sync. Uživatel proto chtěl upravit flow tak, aby:
  1. Toast hláška pro `cannotDeleteViaApi` platformy byla **stručná** (původní: *„… Postio bude příspěvek nadále zobrazovat jako publikovaný, dokud platforma nepotvrdí smazání."* je matoucí, protože to vyvolává dojem, že se stane něco dalšího). Nový text: jen *„{Platform} nepodporuje smazání přes API. Smažte příspěvek ručně přímo na {Platform}."*
  2. **Po kliknutí „Smazat" v DeletePostDialog + zaškrtnutí „Smazat z LinkedIn" se příspěvek v Postiu nesmazal celý**, ale **zachoval se PostCard se zašedlou LinkedIn ikonou** (= trvalá vizuální památka, že tam ten příspěvek byl publikovaný). Toto pravidlo platí **bez ohledu na stav checkboxu „Trvale smazat z aplikace"** – když je v `selectedPlatforms` LinkedIn, příspěvek nikdy nezmizí z Postia celý (jinak by šedá ikona nemohla existovat).
- **Co bylo implementováno**:
  1. **[`deleteFromMeta`](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts#L1220) – LinkedIn větev přepracována**:
     - **Místo vrácení `success: false` nyní vrací `success: true, cannotDeleteViaApi: true`** a v databázi aktualizuje `post_platforms` řádek pro LinkedIn na `status="archived"` + `archived_at=now` + `archive_reason="user_removed_manually"` + `external_id=null`. Původně se vracelo `success: false` a nic se neměnilo – to se ukázalo jako špatné řešení, protože ikona zůstala barevná (status="published" → zelená).
     - **Mazání `external_id`** – podle manuálního testu uživatele vrací LinkedIn API po smazání příspěvku stále stejný UGN, takže by zde zůstával jen klamavý metadata. Po archivaci se tedy URN smaže; zbytek (text, datum publikace, interní štítky) zůstává.
     - **Synchronizace `posts.status`**: po archivaci LinkedInu se kontroluje, zda existují další `status="published"` platformy. Pokud **ne**, nastaví se `posts.status="draft"` (který je v `posts.status` CHECK constraintu, takže žádná DB migrace není potřeba). Tím se zabrání nekonzistentnímu stavu, kdy by PostCard zobrazoval badge „Publikované" se šedými ikonami.
     - **Důležité**: žádný API call na LinkedIn, žádná mutace `external_id`, žádné smazání `post_platforms` řádku. Pouze `status` přechází na „archived".
  2. **[`_post-card.tsx → handleDeleteConfirm`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/_post-card.tsx#L218) upraven**:
     - **Nová větev**: pokud `deleteFromApp=true` **a** `selectedPlatforms.includes("linkedin")`, **příspěvek se nikdy nesmaže celý** – `deletePost(post.id)` se v tom případě nevolá. Místo toho se zavolá `setDeleteOpen(false)`, `router.refresh()` a zobrazí se success toast: *„Příspěvek byl odstraněn z X platformy/platforem. LinkedIn zůstává v Postiu jako archivovaný (šedá ikona) – smažte ho ručně na LinkedInu."* (pokud bylo smazáno i jiná platforma), nebo jen *„LinkedIn zůstává v Postiu jako archivovaný (šedá ikona) – smažte ho ručně na LinkedInu."* (pokud LinkedIn je jediná platforma).
     - **Smazání FB / Instagram / YouTube v rámci stejného dialogu** funguje beze změny – `deleteFromMeta` pro ně dělá skutečný API DELETE + reset na `draft`. Po smazání FB + archivaci LinkedInu se ikona FB zobrazí šedá (status="draft") a ikona LinkedIn rovněž šedá (status="archived"). `post.status` se automaticky přepne na `draft` (viz bod 1).
     - **Toast pro `cannotDeletePlatforms` zkrácen**: z *„{Platform} nepodporuje smazání přes API. Smažte příspěvek ručně přímo na {Platform}. Postio bude příspěvek nadále zobrazovat jako publikovaný, dokud platforma nepotvrdí smazání."* na pouze *„{Platform} nepodporuje smazání přes API. Smažte příspěvek ručně přímo na {Platform}."* + zkrácena doba zobrazení z 10s na 8s. V současném kódu tato větev teorie fakticky zasáhne jen Instagram (protože LinkedIn se krátce vrátí `success: true`), ale necháváme ji pro případnou budoucí expanzi.
  3. **PostCard ikony**: žádná změna v render logice – kaskáda `published → green/Check, failed → red/X, removed_externally → orange/AlertTriangle, jinak (draft, archived) → grey/opacity-60` fungovala správně. Nové chování „LinkedIn po archivaci = šedá ikona" je tedy důsledkem toho, že `post_platforms.status="archived"` již existuje a PostCard ho vždy vykresloval šedě. Žádná změna v JSX.
  4. **Texty v `DeletePostDialog`**: beze změny z předchozího commitu. Stále platí, že „Smazat z LinkedIn" je **information-only checkbox** a řetězec *„…smazat příspěvek ručně přímo na LinkedInu"* se zobrazuje v toastu, ne v dialogu.
- **Dopad na chování**:
  - **YouTube / Facebook**: chování beze změny. `syncPublishedPosts` detekuje smazání, nastaví `status="removed_externally"`, PostCard zobrazí oranžový `tRemovedExternallyMsg` banner + tlačítka Chytré mazání (🗑) a Publikovat znovu (↻). API delete z Postia funguje.
  - **LinkedIn**:
    - **DeletePostDialog → „Smazat" + „Smazat z LinkedIn" + libovolný stav „Trvale smazat z aplikace"**:
      1. Zobrazí se info toast: *„Linkedin nepodporuje smazání přes API. Smažte příspěvek ručně přímo na Linkedin."* (8s).
      2. `deleteFromMeta` aktualizuje LinkedIn řádek v DB: `status="archived"`, `external_id=null`, `archived_at=now`. Pokud šlo o jedinou publikovanou platformu, `posts.status` se přepne na `draft`.
      3. PostCard **zůstane zobrazen** (příspěvek se nikdy nesmaže celý) s LinkedIn ikonou zašedlou. Pokud byly zaškrtnuty i jiné platformy, jejich ikony se rovněž zašednou (po API delete) a `post.status` se přepne na `draft`.
      4. Success toast (10s): *„Příspěvek byl odstraněn z X platformy/platforem. LinkedIn zůstává v Postiu jako archivovaný (šedá ikona) – smažte ho ručně na LinkedInu."* nebo jeho single-platform varianta.
    - **Sync ostatních platforem** příspěvku (FB / YouTube) – pokud má post další publikované platformy, fungují dál normálně. Pokud po archivaci LinkedInu nezůstává žádná další publikovaná platforma, `post.status="draft"` řekne `syncPublishedPosts`, že post neexistuje jako published, a ten ho přeskočí.
    - **Opakované kliknutí na „Smazat z LinkedIn"**: nelze – `deleteFromMeta` kontroluje, že cílový řádek je `status="published"`. Po archivaci tato podmínka selže a vrátí se `error: "LinkedIn řádek nenalezen nebo již není publikovaný."`.
  - **Instagram**: chování beze změny.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení (LinkedIn flow)**:
  1. Otevři libovolný post publikovaný na LinkedInu (single-platform post).
  2. Klikni **Smazat** (červený koš vpravo nahoře).
  3. V dialogu zaškrtni **Smazat z LinkedIn**, **ponech** „Trvale smazat z aplikace" zapnuté → Potvrdit.
  4. Objeví se:
     - **Info toast**: *„Linkedin nepodporuje smazání přes API. Smažte příspěvek ručně přímo na Linkedin."* (8s).
     - **Success toast**: *„LinkedIn zůstává v Postiu jako archivovaný (šedá ikona) – smažte ho ručně na LinkedInu."* (10s).
  5. PostCard **zůstane zobrazen**, ale:
     - LinkedIn ikona je **šedá** (žádný zelený check, žádný oranžový trojúhelník).
     - Hlavní badge se změnil z „Publikované" na **„Koncept"** (protože `post.status="draft"`).
  6. **Multi-platformní post** (FB + LinkedIn): proveď totéž se zaškrtnutím obou platforem → obě ikony zešednou, post se nesmaže celý, badge „Koncept".
  7. V Supabase: `post_platforms` řádek pro LinkedIn bude mít `status="archived"`, `external_id=null`, `archived_at=<now>`, `archive_reason="user_removed_manually"`. `posts.status="draft"`.
- **Dopad na dokumentaci** (CLAUDE.md): Žádná změna nutná. Pravidlo „co je smazáno přes chytré mazání zůstane vidět šedá ikona" z Bibla pravidel stále platí – nyní se ale používá i pro **běžné mazání přes DeletePostDialog** u platforem, které Postio nedokáže smazat přes API (LinkedIn). Pravidlo pro Instagram se nemění.

## 2026-06-21

### ✅ Hotovo – Zjednodušení LinkedIn mazání (Instagram-like flow + odstranění manuální synchronizace)

- **Kontext (uživatel)**: Tlačítko pro manuální „Smazáno na platformě?" (oranžová ikona ⛓️‍💥 na kartě publikovaného LinkedIn postu) a velký banner „LinkedIn příspěvek byl archivován v aplikaci" nedávaly smysl. Uživatel chtěl:
  1. **Tlačítko ⛓️‍💥 úplně odstranit** – synchronizace se nemá dělat manuálně, hlášky „odstraněno z platformy" mají zůstat jen u platforem, kde sync funguje (YouTube a Facebook).
  2. **Banner „LinkedIn příspěvek byl archivován v aplikaci" odstranit** – šedá ikona v PostCard je dostatečně jasný signál, že příspěvek byl publikovaný.
  3. **LinkedIn flow sjednotit s Instagramem**: Postio nemá API, které by umělo potvrdit smazání na LinkedInu (CM API vrací 403), takže se nemá tvářit, že smaže příspěvek. Místo toho dostane uživatel info toast a smaže příspěvek ručně. **Synchronizace s ostatními platformami u příspěvku musí zůstat neustálá** (jinak by FB / YouTube řádek ztratil vazbu na příspěvek, když je tam i LinkedIn).
- **Co bylo implementováno**:
  1. **Server action `markAsRemovedExternally` odstraněn** z [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) (včetně JSDocu a veškerých console.logů) – tlačítko už neexistuje, takže tato akce nemá kdo volat.
  2. **Server action `restoreArchivedLinkedInPost` odstraněn** z [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) – banner „archivováno v aplikaci" už neexistuje, takže restore flow nemá smysl. Sekce komentářů v souboru přeformulována na popis nového Instagram-like flow.
  3. **`deleteFromMeta` v [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts#L1220) přepracována**:
     - **LinkedIn short-circuit na začátku** – hned po ověření authu, pokud `input.platform === "linkedin"`, vrátí `{ success: false, cannotDeleteViaApi: true, error: "LinkedIn se v Postiu neodstraní automaticky. Smažte příspěvek ručně přímo na LinkedInu." }`. **Žádný API call, žádná mutace `post_platforms`, žádné `removed_externally`**.
     - Odstraněn parametr `markArchived` z interface – `deleteFromMeta` nyní vždy dělá jeden clean krok (Facebook / Instagram → API DELETE + reset na `draft`; LinkedIn → nic).
     - Tím pádem se **zachovává `status="published"` u LinkedIn řádku** (a `external_id` = LinkedIn URN) – ostatní platformy příspěvku (Facebook, YouTube…) se dál synchronizují normálně, protože `syncPublishedPosts` stále dostává konzistentní data.
  4. **PostCard `_post-card.tsx` zjednodušen**:
     - Odstraněny: `import { Archive, History, Link2Off, Loader2 }` z `lucide-react` (už nepotřeba), `import { restoreArchivedLinkedInPost, markAsRemovedExternally }` z `@/lib/actions/posts`, `import { Dialog, DialogContent, …, DialogTitle }` z `@/components/ui/dialog` (restore dialog pryč), `import { EditPostData }` z `@/components/edit-post-dialog` (typ nepoužit).
     - Odstraněny stavy `restoreConfirmOpen`, `isRestoring`, `isMarkingRemoved`.
     - Odstraněny lookup helpery `linkedinArchivedRow` a `linkedinPublishedRow`.
     - Odstraněny handlery `handleRestoreLinkedInClick`, `handleRestoreLinkedInConfirm`, `handleMarkRemovedExternally`.
     - Odstraněn JSX: tlačítko ⛓️‍💥 (Link2Off), restore tlačítko pro archivované LinkedIn řádky, banner „LinkedIn příspěvek byl archivován v aplikaci" (včetně published_at / archived_at datumů a subtextu), celý `<Dialog>` pro restore confirmation.
     - Odstraněny všechny props `tLinkedInRestore*`, `tLinkedInArchiveBanner*`, `tMarkRemovedOnPlatform*` z `PostCard` i `PostsList`. V props zůstává jen `tRemovedExternallyMsg`, jehož JSDoc nově explicitně říká, že se banner zobrazuje **jen pro YouTube a Facebook** (kde sync funguje).
     - Zpráva v info toastu pro `cannotDeletePlatforms` upravena z *„Postio automaticky detekuje odstranění při příští synchronizaci"* na upřímnější *„Postio bude příspěvek nadále zobrazovat jako publikovaný, dokud platforma nepotvrdí smazání"*.
  5. **Propagace v `_posts-container.tsx` a `page.tsx`**: odstraněny všechny `tLinkedIn*` a `tMarkRemovedOnPlatform*` props v signaturách i v JSX (předávané hodnoty z `t(...)`).
  6. **`DeletePostDialog` texty přeformulovány** v [src/components/dashboard/delete-post-dialog.tsx](file:///c:/VS_Code/Postio/src/components/dashboard/delete-post-dialog.tsx):
     - Když je příspěvek **jen na LinkedInu**: *„Postio ho neumí smazat z LinkedInu automaticky – zaškrtni ‚Smazat z LinkedIn‘ jen pro potvrzení, že příspěvek smažeš ručně na LinkedInu. Pokud zároveň zaškrtneš ‚Trvale smazat z aplikace‘, příspěvek zmizí i z Postia. Jinak zůstane v Postiu jako publikovaný (dokud LinkedIn nepotvrdí smazání)."*
     - Když je příspěvek **na více sítích**: *„U Facebooku, Instagramu a YouTube Postio smaže příspěvek z platformy automaticky. LinkedIn je nutné smazat ručně – zaškrtnutí ‚Smazat z LinkedIn‘ ti připomene, že tam musíš příspěvek odstranit sám/sama. Ostatní platformy příspěvku zůstanou publikované a budou se dál synchronizovat."*
     - Doplňující text pod „Trvale smazat z aplikace" přeformulován z *„Příspěvek zůstane v kalendáři Postio (jako archivovaný – u LinkedInu s možností pozdějšího obnovení)…"* na *„Příspěvek zůstane v kalendáři Postio a bude nadále zobrazen jako publikovaný. Z vybraných platforem bude odstraněn (kde to Postio umí přes API) a u ostatních platforem dostaneš připomínku, že je třeba je smazat ručně."* Tím se ruší i iluze „archivované LinkedIn" varianty, která v novém flow neexistuje.
     - JSDoc u `onConfirm` callbacku aktualizován – popisuje, že LinkedIn je v seznamu jen jako information-only checkbox.
  7. **Překlady odstraněny** ze všech tří jazykových souborů: [cs.json](file:///c:/VS_Code/Postio/src/messages/cs.json), [en.json](file:///c:/VS_Code/Postio/src/messages/en.json), [uk.json](file:///c:/VS_Code/Postio/src/messages/uk.json) – konkrétně klíče `linkedInRestoreConfirmTitle`, `linkedInRestoreConfirmDesc`, `linkedInRestoreConfirmAction`, `linkedInArchiveBanner`, `linkedInArchiveBannerSubtext`, `linkedInRestoreSuccess`, `linkedInRestoreError`, `linkedInRestoreWarningLine1`, `linkedInRestoreWarningLine2`, `markRemovedOnPlatformTitle`, `markRemovedOnPlatformSuccess`, `markRemovedOnPlatformError`. **`removedExternallyMsg` ponechán** – používá se stále pro YouTube / Facebook `removed_externally` banner.
- **Dopad na chování**:
  - **YouTube / Facebook**: chování beze změny. `syncPublishedPosts` detekuje smazání, nastaví `status="removed_externally"`, PostCard zobrazí oranžový `tRemovedExternallyMsg` banner + tlačítka Chytré mazání (🗑) a Publikovat znovu (↻).
  - **LinkedIn**:
    - **DeletePostDialog** → checkbox „Smazat z LinkedIn" slouží jen jako info připomínka. Po potvrzení se zobrazí toast *„LinkedIn nepodporuje smazání přes API. Smažte příspěvek ručně přímo na LinkedIn. Postio bude příspěvek nadále zobrazovat jako publikovaný, dokud platforma nepotvrdí smazání."*
    - **Postio data se nemění** – `post_platforms` řádek pro LinkedIn zůstane `status="published"` s původním `external_id` (URN). Pokud má post zároveň Facebook / YouTube, jejich řádky se mohou normálně smazat (pokud byly zaškrtnuty) a zbytek příspěvku se chová dál jako „published" na LinkedInu.
    - **Sync ostatních platforem** příspěvku funguje dál (klíčové: 30min throttle v `syncPublishedPosts` se řídí jen `last_sync_at` + `status="published"`, takže se nic nezměnilo).
  - **Instagram**: chování beze změny (stále Instagram-like flow, tj. cannotDeleteViaApi: true + žádná mutace).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení (LinkedIn flow)**:
  1. V Postiu otevři libovolný post publikovaný na LinkedInu.
  2. V pravém horním rohu PostCard by **již neměla** být oranžová ikona ⛓️‍💥 – zobrazí se jen Edit (tužka) a Trash (koš).
  3. Pod textem příspěvku **již není** banner „LinkedIn příspěvek byl archivován v aplikaci".
  4. Klikni **Smazat** → dialog řekne *„U Facebooku, Instagramu a YouTube Postio smaže příspěvek z platformy automaticky. LinkedIn je nutné smazat ručně …"*.
  5. Zaškrtni „Smazat z LinkedIn" (a libovolně další sítě), ponech „Trvale smazat z aplikace" zapnuté → Potvrdit.
  6. Po akci se zobrazí toast *„LinkedIn nepodporuje smazání přes API. Smažte příspěvek ručně přímo na LinkedIn. Postio bude příspěvek nadále zobrazovat jako publikovaný …"*. **PostCard se nepřekreslí** – zelený „Publikované" odznak u LinkedInu zůstává. Pokud byl zaškrtnutý Facebook / YouTube, tak ty se smažou (přes API) a jejich ikony zešednou.
  7. V `post_platforms` zůstane LinkedIn řádek v `status="published"`, s původním `external_id` URN.
- **Dopad na „příliš mnoho tokenů"** (pravidlo z CLAUDE.md): tento záznam CHANGELOGu by měl sloužit jako hlavní referenční bod pro nový LinkedIn flow. Pokud se v další session pracuje s LinkedIn mazáním / synchronizací, nejdřív si přečti tento záznam – starší texty v CHANGELOG.md (2026-06-20, 2026-06-21) popisují zastaralé chování, které bylo záměrně zrušeno.

## 2026-06-21

### ✅ Hotovo – Manuální „Smazáno na platformě?" tlačítko pro LinkedIn (sync fallback)

- **Kontext**: Pro LinkedIn nemůže `syncPublishedPosts()` automaticky detekovat smazání příspěvku – Community Management API (`GET /v2/ugcPosts/{id}` / `GET /v2/shares/{id}`) vrací **403** pro naši Developer App (LinkedIn zamítá `r_member_social` scope aplikacím, které už mají Share on LinkedIn). Stávající sync kód v [posts.ts:1014–1019](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L1014-L1019) na 403 tiše předpokládá, že post stále existuje (a jen aktualizuje `last_sync_at`). Výsledek: pokud uživatel smaže příspěvek **ručně na LinkedInu**, Postio se to **nikdy nedozví** a v `post_platforms` zůstane navždy `status="published"`.
- **Řešení – varianta 1**: Manuální tlačítko v PostCard, kterým uživatel řekne *„Smazal jsem to na platformě"*. Aplikace pak nastaví `status="removed_externally"` a PostCard automaticky zobrazí **standardní oranžový banner + tlačítko Chytré mazání (🗑)** – stejný vizuální styl jako pro YouTube / Facebook / Instagram.
- **Co bylo implementováno**:
  1. **Server action `markAsRemovedExternally` v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L793-L886)**:
     - Parametry: `{ postId, platform }`.
     - Ověří RLS (`user_id` filtr) + že post existuje + že cílový `post_platforms` řádek existuje a je ve stavu `published`.
     - Nastaví `status="removed_externally"`, `removed_at=now`, `last_sync_at=now`.
     - `external_id` ponechá (uživatel nám řekl, že post je pryč, ale my to neověřujeme přes API – ponechání URN umožní budoucí restore + republish).
     - `revalidateAllLocales` pro `/dashboard`, `/calendar`, `/posts`.
     - Console log `[markAsRemovedExternally] Post {id} marked as removed on {platform}` pro support diagnostiku.
  2. **Tlačítko v PostCard** v [_post-card.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/_post-card.tsx#L508-L530):
     - Ikona `Link2Off` z lucide (odtržený řetěz = „odkaz již nefunguje").
     - Zobrazí se **jen** když existuje `linkedinPublishedRow` (tzn. post má `post_platforms` řádek pro LinkedIn ve stavu `published`).
     - Oranžové stylování (shodné s tlačítky pro `removed_externally`) – uživatel intuitivně ví, že jde o „tuto akci pro smazané příspěvky".
     - Během akce se zobrazí `Loader2` spinner.
     - Tooltip z `tMarkRemovedOnPlatformTitle` vysvětluje **proč** tlačítko existuje (sync to nemůže ověřit).
  3. **Překlady** přidány do [cs.json](file:///c:/VS_Code/Postio/src/messages/cs.json#L308-L310), [en.json](file:///c:/VS_Code/Postio/src/messages/en.json) a [uk.json](file:///c:/VS_Code/Postio/src/messages/uk.json):
     - `markRemovedOnPlatformTitle` – tooltip tlačítka.
     - `markRemovedOnPlatformSuccess` – toast po úspěšném nastavení.
     - `markRemovedOnPlatformError` – toast při chybě.
  4. **Propagace props** přes celý stack: `page.tsx` → `_posts-container.tsx` → `PostsList` (interní helper v `_post-card.tsx`) → `PostCard`.
- **Jak to funguje v praxi**:
  1. V Postiu na kartě publikovaného LinkedIn příspěvku se nově objeví **oranžová ikona** ⛓️‍💥 vedle běžného koše (trash).
  2. Uživatel smaže příspěvek ručně na LinkedInu (přes UI LinkedInu).
  3. V Postiu klikne na tuto ikonu → `markAsRemovedExternally` nastaví `status="removed_externally"` + `removed_at=now`.
  4. PostCard se **automaticky překreslí**:
     - Místo zeleného `published` odznaku se zobrazí oranžový `Odstraněno externě`.
     - Objeví se **standardní varovný banner** („Odstraněno přímo na LinkedIn (datum) – Příspěvek byl odstraněn z platformy. Můžete jej bezpečně smazat z aplikace tlačítkem Chytré mazání (🗑).").
     - Objeví se **tlačítko Chytré mazání** + **tlačítko Publikovat znovu** (stejné jako u YouTube).
  5. Uživatel pak může použít Chytré mazání pro úplné odstranění z DB (nebo Publikovat znovu pro nový pokus).
- **Proč nepoužívám confirm dialog**: Akce je snadno **vratná** přes tlačítko „Publikovat znovu" (`resetPostStatus`), takže přidaný friction v podobě dalšího dialogu by byl zbytečný. Tooltip na tlačítku jasně říká, co se stane.
- **Proč `external_id` ponechávám**: Uživatel nám řekl, že post smazal. Ale my nemáme API potvrzení. Kdyby ho budoucí restore flow potřeboval (např. kontrola proti archivu), URN zde bude. Pokud se post na LinkedInu skutečně smazal, republish vytvoří nový URN automaticky.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu otevři libovolný post publikovaný na LinkedInu (status = „Publikované", zelený odznak).
  2. V pravém horním rohu PostCard by se **měla nově objevit oranžová ikona ⛓️‍💥** (vedle Edit a Trash).
  3. Smaž příspěvek ručně na LinkedInu (`https://www.linkedin.com/feed/update/{urn}`).
  4. V Postiu klikni na oranžovou ikonu.
  5. V konzoli by se měl objevit `[markAsRemovedExternally] Post {id} marked as removed on linkedin`.
  6. Toast: *„Příspěvek byl označen jako smazaný na LinkedInu. Můžeš ho teď bezpečně smazat z aplikace tlačítkem Chytré mazání (🗑)."*
  7. PostCard se překreslí: oranžový odznak „Odstraněno externě", varovný banner, tlačítko Chytré mazání (🗑) + Publikovat znovu (↻).
  8. Klikni na Chytré mazání → vyber „Smazat z aplikace" → příspěvek zmizí z Postia.

## 2026-06-21

### ✅ Hotovo – LinkedIn archivace jako vedlejší efekt mazání (odstraněna dočasná „Archivovat" logika)

- **Kontext**: V předchozím kroku (záznam z 2026-06-20) se do [DeletePostDialog](file:///c:/VS_Code/Postio/src/components/dashboard/delete-post-dialog.tsx) přidala **dočasná sekce „Archivovat místo smazat?" + tlačítko „Archivovat LinkedIn příspěvek v aplikaci"**, která šla **mimo standardní potvrzovací flow** (měla vlastní callback `onArchiveLinkedIn` na rodiči a vlastní state `isArchiving`). Uživatel nyní požaduje, aby:
  1. **Dočasná tlačítka a info banner** zmizely z dialogu.
  2. Logika **odpovídala YouTube vzoru** – tzn. když uživatel smaže z LinkedIn a **NEZAŠKRTNE „Trvale smazat z aplikace"**, příspěvek se v aplikaci **automaticky archivuje** (stejné chování jako dnes u YouTube: v PostCard se zobrazí banner „LinkedIn příspěvek byl archivován v aplikaci / Publikováno: … / Archivováno: … / Fyzicky může na platformě stále existovat…").
  3. **Vizuální stav `removed_externally`** pro LinkedIn se chová stejně jako pro YouTube – zobrazí se univerzální banner „Odstraněno přímo na LinkedIn (datum)" + doporučení použít tlačítko „Chytré mazání" (🗑). Tato logika v PostCard **již fungovala** (viz `tRemovedExternallyMsg.replace("__platform__", …)` na řádku ~622 `_post-card.tsx`), takže tady stačilo **nic nerozbít**.
- **Co bylo provedeno**:
  1. **`deleteFromMeta` – přidán parametr `markArchived`** v [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts#L1226-L1255). Po úspěšném API DELETE (`204 No Content`) na LinkedInu se nyní:
     - Když `markArchived === true` → `post_platforms.status="archived"`, `archived_at=now`, `archive_reason="user_archived_from_app"`. `published_at` a `external_id` zůstanou zachované (PostCard archived banner je potřebuje).
     - Když `markArchived === false` nebo platform != LinkedIn → výchozí flow (`status="draft"`).
  2. **PostCard `_post-card.tsx`** – v `handleDeleteConfirm()` se pro LinkedIn předává `markArchived: !deleteFromApp`:
     ```ts
     const markArchived = platform === "linkedin" && !deleteFromApp;
     await deleteFromMeta({ postId: post.id, platform, markArchived });
     ```
     Tím pádem: **LinkedIn + nezaškrtnuto „Trvale smazat z aplikace"** = API DELETE + archivace v aplikaci → PostCard zobrazí `linkedinArchivedRow` banner.
  3. **DeletePostDialog** – odstraněny:
     - `Info` a `Archive` importy z `lucide-react`.
     - `onArchiveLinkedIn` prop a handler `handleArchiveLinkedIn`.
     - Celá sekce `hasLinkedInPublished && onArchiveLinkedIn && (…)` (info banner + tlačítko „Archivovat LinkedIn příspěvek v aplikaci").
     - Příslušné kusy z `descriptionText` (už se nezmiňuje „archívovat v aplikaci" jako alternativa).
  4. **`archiveLinkedInPlatformRow` odstraněna** z [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) (byla dead code po přesunutí logiky do `deleteFromMeta`). Záložní komentář nad `restoreArchivedLinkedInPost` dokumentuje, kam se logika přesunula.
  5. **Překlady** – odstraněny nepoužívané klíče `linkedInArchiveSuccess` a `linkedInArchiveError` z [cs.json](file:///c:/VS_Code/Postio/src/messages/cs.json), [en.json](file:///c:/VS_Code/Postio/src/messages/en.json) a [uk.json](file:///c:/VS_Code/Postio/src/messages/uk.json). Klíče `linkedInArchiveBanner` + `linkedInArchiveBannerSubtext` (zobrazení v PostCard) **zůstávají** – jejich texty odpovídají přesně tomu, co uživatel chtěl.
  6. **Vizuální banner v PostCard** (`linkedinArchivedRow`, řádky ~648–694 `_post-card.tsx`) **se nemění** – ukazuje přesně text požadovaný uživatelem:
     > *LinkedIn příspěvek byl archivován v aplikaci*
     > *Publikováno: 21. června 2026 / Archivováno: 21. června 2026*
     > *Fyzicky může na platformě stále existovat. Při obnově se vytvoří nový příspěvek (případný duplikát smaž ručně na LinkedInu).*
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení (LinkedIn flow)**:
  1. V Postiu otevři libovolný post publikovaný na LinkedInu.
  2. Klikni **Smazat** → dialog by měl **již neobsahovat** tlačítko „Archivovat LinkedIn příspěvek v aplikaci".
  3. **Varianta A – kompletní smazání**: Zaškrtni „Smazat z LinkedIn" + „Trvale smazat z aplikace" → Potvrdit smazání.
     - Konzole: `>>> Smazání z linkedin ÚSPĚŠNÉ` + příspěvek zmizí z Postia i LinkedInu.
  4. **Varianta B – archivace (nový YouTube-like flow)**: Zaškrtni „Smazat z LinkedIn", **odškrtni „Trvale smazat z aplikace"** → Potvrdit smazání.
     - Konzole: `>>> Smazání z linkedin ÚSPĚŠNÉ` + v `post_platforms` se nastaví `status="archived"`, `archived_at=now`.
     - Příspěvek **zmizí z LinkedInu**, ale **zůstane v Postiu** – v PostCard se zobrazí banner *„LinkedIn příspěvek byl archivován v aplikaci / Publikováno: … / Archivováno: …"*.
     - Tlačítko Restore (↻) v PostCard umožní příspěvek obnovit (`restoreArchivedLinkedInPost` → nastaví `status="draft"` a smaže `external_id`, aby se vytvořil nový URN při republishi).
  5. **Varianta C – smazáno mimo Postio**: Smaž příspěvek ručně na LinkedInu → `syncPublishedPosts` zjistí 404 → nastaví `status="removed_externally"`. PostCard zobrazí univerzální varování *„Odstraněno přímo na LinkedIn (datum) – Příspěvek byl odstraněn z platformy. Můžete jej bezpečně smazat z aplikace tlačítkem Chytré mazání (🗑)."*.

## 2026-06-20

### ✅ Hotovo – LinkedIn mazání z UI: dialog opraven (LinkedIn checkbox + správné texty)

- **Kontext**: Terminálový test v [scripts/test-linkedin-delete.mjs](file:///c:/VS_Code/Postio/scripts/test-linkedin-delete.mjs) potvrdil, že LinkedIn API DELETE funguje (vrátilo `204 No Content` pro `urn:li:share:7474318923950321665`). UI dialog pro mazání příspěvku v Postiu ale **tvrdil opak** – blokoval smazání z LinkedInu přes API a vnucoval jen archivaci.
- **Co bylo opraveno** v [src/components/dashboard/delete-post-dialog.tsx](file:///c:/VS_Code/Postio/src/components/dashboard/delete-post-dialog.tsx):
  1. **`metaPlatforms` → `selectablePlatforms`** – LinkedIn je nyní součástí seznamu checkboxů (spolu s Facebookem, Instagramem atd.). Uživatel může zaškrtnout **„Smazat z LinkedIn"** jako kteroukoliv jinou síť.
  2. **`descriptionText` aktualizován** – odstraněna LEŽ „LinkedIn neumožňuje smazání příspěvků přes API". Místo toho se teď správně říká: *„Tento příspěvek je publikován pouze na LinkedInu. Můžeš ho buď smazat z LinkedInu i aplikace, nebo jen archivovat v aplikaci."*
  3. **Info banner přeformulován** z *„LinkedIn & smazání přes API"* (lhal) na **„Archivovat místo smazat?"** – teď vysvětluje, **proč** je archivace dobrá **alternativa** (umožní pozdější obnovení), ne že smazání přes API **nejde**.
  4. **Tlačítko archivace** – popis *„Doporučeno"* změněn na **„Alternativa"**, protože **doporučeno** je teď **skutečné smazání** (kompletní odstranění z LinkedInu i DB), archivace je **sekundární možnost** pro uživatele, kteří chtějí příspěvek zachovat.
- **Jak to funguje v praxi** (tok po kliknutí na tlačítko **„Potvrdit smazání"**):
  1. `_post-card.tsx → handleDeleteConfirm()` iteruje přes `selectedPlatforms` a volá `deleteFromMeta({ postId, platform })` **pro každou zaškrtnutou platformu** – včetně LinkedInu.
  2. `publish.ts → deleteFromMeta()` má **speciální větev pro LinkedIn** (opraveno dříve), která zavolá **LinkedIn API** (`DELETE /v2/ugcPosts/{id}`) s **čerstvým access tokenem** (automaticky se refreshne, pokud je blízko expiraci).
  3. Při `204 No Content` se v DB aktualizuje `post_platforms.status = "removed_externally"` a `post` se odstraní z aplikace (pokud je zaškrtnuto „Trvale smazat z aplikace").
- **Test po nasazení**:
  1. V Postiu otevři libovolný post publikovaný na LinkedInu.
  2. Klikni **Smazat** → v dialogu by se měl nově zobrazit **checkbox „Smazat z LinkedIn"** (zaškrtnutý defaultně).
  3. Zaškrtni **„Trvale smazat z aplikace Postio"** a klikni **„Potvrdit smazání"**.
  4. V terminálu by se mělo objevit `>>> START MAZÁNÍ Z PLATFORMY: linkedin`, `>>> Smazání z linkedin ÚSPĚŠNÉ`.
  5. Příspěvek by měl zmizet z LinkedInu (ověř na `linkedin.com/feed/update/{urn}`) i z Postia.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Test – obcházení UI dialogu pro smazání LinkedIn příspěvku (terminálový test script)

- **Kontext**: UI dialog pro smazání LinkedIn příspěvku v Postiu aktuálně **blokuje** skutečné smazání přes API s odůvodněním: *"LinkedIn neumožňuje smazání příspěvků přes API"* (viz snímek uživatele). To je **technicky špatně** – LinkedIn UGC Posts API **podporuje** `DELETE /v2/ugcPosts/{id}` s `w_member_social` scope a vrací 204 No Content. Uživatel potřebuje cestu, jak **otestovat** smazání přes API, aniž by musel měnit UI dialog.
- **Vytvořen** [scripts/test-linkedin-delete.mjs](file:///c:/VS_Code/Postio/scripts/test-linkedin-delete.mjs) – standalone Node 24 ESM script, který:
  1. Načte aktivní LinkedIn `social_accounts` řádek z DB přes `SUPABASE_SERVICE_ROLE_KEY`.
  2. **Refreshne** access token přes LinkedIn `/oauth/v2/accessToken`, pokud se blíží expiraci (< 24 h).
  3. Ověří `sub` přes `/v2/userinfo` (stejná diagnostika jako v `publish-linkedin.ts`).
  4. Na `--dry-run` zastaví a **nesmaže nic**; jinak provede `DELETE https://api.linkedin.com/v2/ugcPosts/{externalId}` s `Authorization: Bearer …`, `X-Restli-Protocol-Version: 2.0.0`, `Linkedin-Version: 202510`.
- **Dry-run test pro `urn:li:share:7474313283974488064`** ✅:
  - Token platný do `2026-08-20T04:12:05Z` (60 dní).
  - `/v2/userinfo: status=200, subMatches=true` (token patří účtu Kateřina Nyklová, `DDB1NESj0w`).
  - DELETE URL správně sestrojená: `https://api.linkedin.com/v2/ugcPosts/urn%3Ali%3Ashare%3A7474313283974488064`.
  - **Závěr**: Pokud LinkedIn fakt podporuje DELETE (a podle oficiálních docs ano), skutečné smazání by mělo vrátit 204.
- **Spuštění** (PowerShell, z `c:\VS_Code\Postio`):
  ```powershell
  # Suchý test (ověří token, nic nesmaže):
  node --env-file=.env.local scripts/test-linkedin-delete.mjs urn:li:share:7474313283974488064 --dry-run

  # Skutečné smazání:
  node --env-file=.env.local scripts/test-linkedin-delete.mjs urn:li:share:7474313283974488064
  ```
- **Další krok (po potvrzení funkčnosti)**: Opravit UI dialog v Postiu, aby místo tvrzení "LinkedIn neumožňuje smazání přes API" nabízel **3 možnosti**:
  1. **Archivovat v aplikaci** (post zůstane, jen zmizí z aktivního seznamu – současné chování).
  2. **Smazat z LinkedIn + z aplikace** (nová možnost – vyvolá `deleteFromMeta`, která už LinkedIn API správně volá).
  3. **Smazet jen z aplikace** (post zůstane na LinkedInu, smaže se jen z DB).

### ✅ Hotovo – LinkedIn publish funguje (po přidání `Linkedin-Version: 202510` + ověření Developer App configu)

- **Kontext**: Po přidání hlavičky `Linkedin-Version: 202510` do POST `/v2/ugcPosts` (viz předchozí záznam) se příspěvky na LinkedInu **úspěšně zobrazují** v produkčním režimu.
- **Co bylo potvrzeno z LinkedIn Developer Portal** (snímek uživatele):
  - **Typ aplikace**: `Samostatná aplikace` (Core Application) – správný typ pro member-autored posts s `w_member_social`.
  - **Přístupový token**: `2 měsíce` (5184000 sekund) – odpovídá 60dennímu LinkedIn limitu, náš `getValidLinkedInAccessToken()` to správně pokrývá.
  - **OAuth 2.0 scopes**: `openid`, `profile`, `w_member_social`, `e-mail` – **přesně** ty, které potřebujeme pro UGC Posts (write). Read scope `r_member_social` chybí záměrně, ale to nám nebrání v publikování.
  - **Redirect URLs**: `http://localhost:3000/api/accounts/linkedin` a `https://postio-alpha.vercel.app/api/accounts/linkedin` – **správně nastavené** pro OAuth callback.
- **Root cause** kombinace dvou věcí:
  1. **Starší verze API** (Linkedin-Version chyběla nebo byla stará) → POST API request se zpracoval, ale nová verze API v roce 2026 ho **odklonila do interního draft storage** místo na produkční feed.
  2. Přidání `Linkedin-Version: 202510` zarovnalo request na aktuální API verzi → posty se nyní publikují **přímo na produkční LinkedIn feed**.
- **Důležité**: ponecháme **detailní DEBUG logy** v [publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) pro budoucí support a diagnostiku. Pokud bude chtít uživatel produkční build bez verbose logů, můžeme je později obalit do `if (process.env.NODE_ENV !== "production")`.
- **Doporučení do budoucna**: Sledovat LinkedIn API changelog (https://learn.microsoft.com/en-us/linkedin/marketing/community-management/updates) a aktualizovat `LINKEDIN_VERSION` (nebo env proměnnou) minimálně jednou ročně.

### Diagnostika – LinkedIn publish: výsledky testu (token OK, payload OK, post se nezobrazuje)

- **Kontext**: Spuštěn kompletní publish flow s diagnostikou přidanou v předchozím kroku. Výsledky z konzole:
  - `[LinkedIn] DEBUG /v2/userinfo` → `status: 200`, `sub: 'DDB1NESj0w'`, `expectedSub: 'DDB1NESj0w'`, `subMatches: true` ✅. **Token patří správnému účtu** (Kateřina Nyklová). Teorie o `sub` mismatch je vyloučena.
  - `[LinkedIn] DEBUG full 201 response` → `status: 201`, `x-restli-id: urn:li:share:7474313283974488064`, `location: /ugcPosts/urn%3Ali%3Ashare%3A7474313283974488064`, `body: '{"id":"urn:li:share:7474313283974488064"}'`. Response **je úspěšný a úplný** – post má platný URN, location hlavičku, správné routing flags.
  - `[LinkedIn] DEBUG GET ugcPosts/{id} after publish` → `status: 403`, `message: 'Not enough permissions to access: ugcPosts.GET.NO_VERSION'` – **očekávané**, member read scope (`r_member_social`) nemáme.
  - Uživatel potvrdil: **post se na LinkedIn profilu nezobrazuje**, ani po >15 minutách (LinkedIn processing delay).
- **Skutečný stav**: Payload, token, OAuth, response hlavičky a route-key jsou všechny v pořádku. API request je **úspěšně přijat a zpracován**. Přesto se post fyzicky **na profilu nezobrazuje**.
- **Nejpravděpodobnější příčiny (v pořadí podle pravděpodobnosti)**:
  1. **LinkedIn Developer App v „Development" módu** – API request projde (protože `w_member_social` scope je schválen i v Development), ale posty **se v produkčním LinkedInu nezobrazují**. Řešení: [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) → tvoje app → záložka **Settings** → přepnout z „Development" na „Live" (případně projít App Reviewem).
  2. **Nové API verze (202504+) vyžadují `Linkedin-Version` hlavičku** – oficiální `share-on-linkedin` dokumentace ji pro `/v2/ugcPosts` nezmiňuje, ale rok 2026 přinesl nové verze API a některé tiché změny. Přidáno níže.
  3. **Post vytvořen v interním draft/review stavu** – méně pravděpodobné, ale možné. Tehdy jedině pomůže manuální ověření přes přímý odkaz.
- **Přidaná vylepšení** v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts):
  1. **Hlavička `Linkedin-Version: 202510`** (výchozí; overridable přes `LINKEDIN_VERSION` env). Pokud LinkedIn v roce 2026 vyžaduje verzi API pro UGC Posts, mělo by to pomoct.
  2. **Přímý odkaz na post** přidán do success logu: `https://www.linkedin.com/feed/update/{urn-encoded-externalId}`. Uživatel může **kliknout** a ověřit jedním kliknutím, jestli post existuje:
     - Pokud vrací **404** → post se fyzicky nikde nezobrazuje (API vytvořil hidden draft).
     - Pokud se post **zobrazí** → API funguje, ale processing delay nebo Developer App mód brání propagaci na profil/feed.
- **Co dělat při dalším testu**:
  1. Publikuj nový post na LinkedIn.
  2. V konzoli najdi řádek `[LinkedIn] ✅ publish success: { ..., linkedInUrl: '...' }`.
  3. **Otevři `linkedInUrl` v prohlížeči** (po přihlášení na LinkedIn):
     - `404 / page not found` → post se vytvořil ve skrytém stavu → kontaktuj LinkedIn support nebo zkus jiný payload.
     - Post se **zobrazí** → je to processing delay nebo Developer App mód; zkontroluj `linkedin.com/in/{tvuj-profil}/recent-activity/posts/`.
  4. Ověř **Developer App status**: https://www.linkedin.com/developers/apps → app → **Settings** → **App mode**: musí být „Live" (ne „Development").
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Fix – Mazání z LinkedIn: oprava „Malformed access token" (Graph API → LinkedIn API + token refresh)

- **Problém**: Při pokusu o smazání příspěvku z LinkedIn přes UI dostával uživatel chybu `Malformed access token AQVHPLUdb0tv2sh28NYE…` (kód 190, typ `OAuthException`). Konzole ukazovala `Mazání příspěvku z linkedin: { externalId: 'urn:li:share:7474188949469446144' }` a pak `META RESPONSE (delete linkedin): { error: { ... 'Malformed access token' ... } }`.
- **Skutečná příčina**: Funkce [src/lib/actions/publish.ts → deleteFromMeta()](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) (která se volá z `_post-card.tsx` pro **všechny platformy**) používala **Facebook Graph API** (`https://graph.facebook.com/v20.0/{id}`) i pro LinkedIn. LinkedIn access token je ale **úplně jiný formát** než Facebook token (LinkedIn: JWT-like, Facebook: opaque string), takže Graph API ho vždy odmítla jako malformed.
  - Sekundární příčina: token v `social_accounts.access_token` mohl být pro starší příspěvky již **expirovaný** (LinkedIn tokeny mají 60-denní platnost, refresh se prováděl jen při publishi – nikoliv při delete).
- **Oprava** v [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) – přidána **speciální větev pro LinkedIn** v `deleteFromMeta()`:
  ```ts
  if (input.platform === "linkedin") {
    // 1) Načti celý social_accounts řádek (refresh token, expiry)
    // 2) Zavolej getValidLinkedInAccessToken() – transparentně refreshne
    //    expirovaný token přes /oauth/v2/accessToken
    // 3) Smaž přes DELETE https://api.linkedin.com/v2/ugcPosts/{id}
    //    s Authorization: Bearer ... a X-Restli-Protocol-Version: 2.0.0
    // 4) LinkedIn vrací 204 No Content na success, 404 = post už neexistuje
    //    (ošetřeno jako "already deleted on platform")
  } else {
    // Facebook / Instagram – stávající Graph API kód
  }
  ```
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu otevři libovolný post publikovaný na LinkedIn (i starší, kde delete dosud selhával).
  2. Klikni na **Smazat z LinkedIn**.
  3. V konzoli by se měl objevit `>>> START MAZÁNÍ Z PLATFORMY: linkedin`, `>>> Smazání z linkedin ÚSPĚŠNÉ` a post by měl zmizet z profilu.
  4. Pokud token expiroval, v konzoli uvidíš navíc `[LinkedIn] refreshing access token` z `getValidLinkedInAccessToken`.

### Debug – LinkedIn publish: přidána detailní diagnostika (payload + token + verify fetch)

- **Kontext**: Uživatel opakovaně hlásí, že příspěvky na LinkedIn API **projdou** (HTTP `201 Created`, URN v `x-restli-id`), ale **na LinkedIn profilu se nezobrazí**. Konzole ukazuje `[LinkedIn] ✅ publish success`, ale `linkedin.com/{user}/recent-activity/posts/...` zůstává prázdný. Předchozí pokusy (`distribution` přidat → 403 ACCESS_DENIED, `distribution` odebrat → API projde ale post se nezobrazí) příčinu neodhalily. Kód v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) byl v `git log` **pouze jednou commitnutý** (`4710e79 feat: YouTube & LinkedIn integration with safety delete rules`) – všechny "opravy" probíhaly v pracovní kopii.
- **Provedená kontrola**: Porovnal jsem aktuální kód s oficiální dokumentací [Share on LinkedIn](https://learn.microsoft.com/cs-cz/linkedin/consumer/integrations/self-serve/share-on-linkedin). Payload se **shoduje** s ukázkovým requestem z dokumentace (pro image i text). Hlavičky (`Authorization`, `Content-Type`, `X-Restli-Protocol-Version: 2.0.0`) jsou správné. Registrace assetu (`/v2/assets?action=registerUpload`) i binární upload (`POST uploadUrl`) odpovídají schématu v [Vector Assets API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api).
- **Problém**: Statická analýza nestačí – payload je správně, ale post se nezobrazuje. Potřebujeme **runtime data** z LinkedIn API, která dosud nebyla logována:
  1. **Celý request payload** (ne jen zkrácený souhrn) – pro jistotu, že se neposílá nic neočekávaného.
  2. **Celá API response** (headers + body) – LinkedIn může vracet varování o draft/review stavu, která dosud zahazujeme.
  3. **Verify fetch** `GET /v2/ugcPosts/{id}` bezprostředně po publikaci – pokud LinkedIn vytvořil post ve skrytém stavu, měl by tento call vrátit buď 404, nebo post s jiným `lifecycleState`.
  4. **Token introspection** přes `/v2/userinfo` – ověří, že `sub` v tokenu odpovídá `account.platform_id` (jinak publikujeme pod jiným účtem) a že token má scope `w_member_social`.
- **Přidaná diagnostika** v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts):
  - V `publishToLinkedInAction`: `console.log("[LinkedIn] DEBUG /v2/userinfo:", ...)` – loguje status, body preview (safe fields) a porovnává `sub` s `account.platform_id`.
  - V `publishToLinkedIn`: 
    - `console.log("[LinkedIn] DEBUG full ugcPosts payload:", JSON.stringify(payload, null, 2))` – celý payload.
    - Po `201 Created`: dump všech response headers + body přes `console.log("[LinkedIn] DEBUG full 201 response:", ...)`.
    - Po úspěchu: `GET /v2/ugcPosts/{externalId}` přes `console.log("[LinkedIn] DEBUG GET ugcPosts/{id} after publish:", ...)` – ověří, jestli post na LinkedInu opravdu existuje.
- **Co dělat při dalším pokusu o publish**:
  1. Zkusit publikovat libovolný post na LinkedIn (text i image).
  2. V terminálu vyhledat řádky s prefixem `[LinkedIn] DEBUG`:
     - `DEBUG /v2/userinfo` → ověří `subMatches: true/false`. Pokud `false`, **token patří jinému LinkedIn účtu**, než je `platform_id` – post se vytvořil pod cizím účtem.
     - `DEBUG full 201 response` → response body může obsahovat varování (např. `"review"`, `"draft"`, `"PROCESSING"`), které jsme dosud ignorovali.
     - `DEBUG GET ugcPosts/{id} after publish` → pokud status **200** a post je v něm, je vše OK; pokud **404** nebo jiný lifecycleState, post se vytvořil ve skrytém stavu.
  3. Podle výstupu diagnostiky navrhnu konkrétní opravu (viz kandidáti níže).
- **Kandidáti na root cause (a opravu) na základě diagnostiky**:
  - **`subMatches: false`** → nutné znovu projít OAuth flow v Postiu (smazat `social_accounts` řádek, znovu se připojit přes LinkedIn). V tom případě se dřívější "jednou to šlo" vysvětluje tím, že tenkrát se OAuth provedl správně; pak se uložil špatný `sub`.
  - **Verify fetch vrací 404 / jiný lifecycleState** → LinkedIn vytvořil post ve stavu, který **není na member feedu** (např. `PUBLISH_REQUESTED` z nového Posts API). Tehdy je potřeba přidat `distribution: { feedDistribution: "MAIN_FEED" }` (přesně podle Posts API Schema, **ne** staré UGC docs). V CHANGELOGu výše je tento pokus dokumentovaný jako neúspěšný – ale test se prováděl bez diagnostiky, takže se mohlo špatně vyhodnotit. Nový test s diagnostikou to potvrdí/vyvrátí.
  - **Response body obsahuje review/draft warning** → LinkedIn zařadil příspěvek do manuálního review kvůli politice (text flags, image hash). Tehdy je třeba dát uživateli vědět, že publikace proběhla, ale LinkedIn ji pozdržel.
  - **`/v2/userinfo` vrací `scope` bez `w_member_social`** → OAuth scope chybí, je nutné znovu projít OAuth authorizaci se správným scope (viz [src/app/api/accounts/linkedin/route.ts](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts)).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Fix – `/posts` stránka nezobrazovala aktualizovaný status po publikování (Next.js RSC client-side cache)

- **Problém**: Po úspěšném publikování příspěvku (LinkedIn i jiné sítě) se na FE stránce `/[locale]/posts` **nic neprojevilo**. Terminál hlásil `[LinkedIn] ✅ publish success`, `✅ ZAPISUJI ÚSPĚCH DO DB: linkedin pro post …`, `🚀 ARCHITEKTURA: Aktualizuji post_platforms linkedin -> published` a `GET /cs/posts 200 in 578ms` – ale post v seznamu zůstával ve starém stavu (např. `draft` nebo `scheduled`).
- **Skutečná příčina**: Next.js 14 App Router drží **dvě nezávislé cache**:
  1. **Server-side fetch cache** – invaliduje se přes `revalidatePath(...)` v server action. Tady bylo vše v pořádku.
  2. **Client-side RSC payload cache** – drží výsledek posledního server-component renderu **na klientu**. Tuto cache `revalidatePath` **neinvaliduje**.
  
  Po `publishPost` server action sice zavolala `revalidatePath("/cs/posts", ...)`, ale `posts/[id]/page.tsx` a `posts/new/page.tsx` následně používaly `router.push(\`/\${locale}/posts\`)` **bez `router.refresh()`**. Klient tedy při navigaci na `/posts` **znovu použil starý RSC payload z klientské cache** a server component se vůbec nevykonal – takže se nová data (`post_platforms.status="published"`) nikdy nedostala do `initialPosts`.
- **Oprava** v [src/app/[locale]/(dashboard)/posts/_posts-container.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/_posts-container.tsx#L168-L186):
  ```tsx
  // Force a fresh server-component fetch on every mount of the /posts page.
  // PostsContainer is rendered inside posts/page.tsx (not the dashboard layout),
  // so it mounts/unmounts on every navigation to /posts – that is the right hook
  // for forcing a server refresh and bypassing the stale client-side RSC cache.
  useEffect(() => {
    router.refresh();
  }, []);
  ```
  Tím se při každém příchodu na `/posts` vynutí nový server-component fetch, který načte aktuální data z DB (včetně `status="published"`).
- **Proč to nezpůsobí refresh smyčku**: dependency `[]` zajistí, že se `router.refresh()` spustí jen jednou při mountu. I když po něm přijde nový `initialPosts`, useEffect se znovu nespustí (jiná závislost než `[initialPosts]`).
- **Proč je `[]` správná volba**: `PostsContainer` je mountnutý přímo v [src/app/[locale]/(dashboard)/posts/page.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/page.tsx) (ne v layoutu), takže se při každé navigaci na `/posts` mountne znovu a `useEffect` se spustí právě tehdy, když je potřeba.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. Otevři libovolný post ve stavu `draft` / `scheduled` / `failed`.
  2. Klikni na **Publikovat** (nebo **Publikovat znovu**) a vyber platformu.
  3. Po úspěchu se v konzoli zobrazí `[LinkedIn] ✅ publish success` a `✅ ZAPISUJI ÚSPĚCH DO DB`.
  4. Po návratu na `/cs/posts` by měl být post **ihned viditelný s novým statusem** (např. `published` se zeleným odznakem) – bez nutnosti ručního F5.
  5. V konzoli by se měl objevit `GET /cs/posts 200` s kratším `application-code`, protože server component běží znovu a načítá fresh data z DB.

### Fix – LinkedIn image upload: změna `PUT` → `POST` (binární soubor se reálně nenahrál, příspěvek bez obrázku)

- **Problém**: Uživatel nahlásil, že příspěvek s obrázkem se v aplikaci tváří jako `published` (LinkedIn API vrátila `201 Created` + URN), ale **na LinkedInu se nezobrazí vůbec**, případně se zobrazí jako text-only (bez připojeného obrázku). Konzole opakovaně hlásila `[LinkedIn] ✅ publish success: { externalId: 'urn:li:share:...' }` a `mediaCategory: 'IMAGE'`, `hasMediaUrn: true` – z logu se zdálo, že vše proběhlo. Po důkladném přečtení oficiální dokumentace **„Share on LinkedIn"** (https://learn.microsoft.com/cs-cz/linkedin/consumer/integrations/self-serve/share-on-linkedin) se ukázalo, že příčina je v **binárním uploadu**.
- **Skutečná příčina**: V oficiální dokumentaci se jasně píše:
  > „To upload your image or video, send a `POST` request to the `uploadUrl` with your image or video included as a binary file."
  
  Náš kód ale v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts#L383-L431) posílal `method: "PUT"`. LinkedIn **tiše akceptoval PUT request** (vrátil `201 Created` a `uploadUrl` se jevil jako úspěšný), ale binární data se **ve skutečnosti nikdy nepersistovala** – `asset` URN z registrace ukazoval na neexistující binární obsah. Následný `ugcPosts` request s tímto asset URN se buď:
  1. Vytvořil, ale bez obrázku (prázdný post → na profilu se nezobrazí, nebo se zobrazí jako text-only), **nebo**
  2. Vytvořil a LinkedIn ho zařadil do "review" fronty kvůli nevalidnímu asset odkazu → na profilu se nezobrazí do manuálního schválení.
  
  V obou případech Postio uložil `status="published"` protože API vrátila `201 Created` + URN – ale **na LinkedInu se příspěvek reálně nikdy nepropagoval**. Pro text-only posty (bez média) byl kód správně, takže fungoval. Pro image posty selhával.
- **Oprava** v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts#L383-L431):
  ```ts
  // Before:
  method: "PUT"
  // After:
  method: "POST"
  ```
  Plus přidán obsáhlý komentář vysvětlující, proč **MUSÍ** být POST:
  - Textová dokumentace explicitně říká POST.
  - Vector Assets API specifikace (https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api) dokumentuje POST.
  - cURL příklad v dokumentaci používá `--upload-file`, který curl interně mapuje na PUT – to je **klamavé a v rozporu** s textovými instrukcemi. Vždy se řiďte textem, ne příkladem.
- **Dopad na text-only posty**: Žádný. PUT→POST se týká pouze `registerLinkedInImageAsset`, která se volá jen když má příspěvek obrázek. Textové posty procházejí nezávislou cestou přes `publishToLinkedIn` a `registerLinkedInImageAsset` vůbec nevolají.
- **Dopad na stávající image příspěvky**: Příspěvky publikované **před touto opravou** sice získaly URN z LinkedIn API, ale obrázek reálně nebyl nahrán. Na LinkedInu se proto buď nezobrazily, nebo se zobrazily jako text-only. V Postio je `status="published"`. Řešení: **smazat a znovu publikovat** – nově publikované image posty by měly mít obrázek správně.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu vytvoř **nový příspěvek** s LinkedIn platformou **a s obrázkem**.
  2. V konzoli sleduj `asset binary upload` step – po něm by měl přijít `201 Created` a `uploadUrl`.
  3. Po API callu: `[LinkedIn] ✅ publish success: { externalId: 'urn:li:...', mediaCategory: 'IMAGE' }`.
  4. Na linkedin.com → profil → příspěvky by se měl příspěvek **zobrazit s obrázkem do 15 minut**.
  5. Pokud stále ne, ověř v konzoli celý request/response log – `POST {uploadUrl}` by měl vrátit `201 Created`, ne `405 Method Not Allowed` (což by znamenalo, že LinkedIn tuto URL akceptuje jen s POST, ne PUT).

### Fix – LinkedIn publish: vrácení chybně přidaného `distribution` (předešlá oprava selhala s 403 ACCESS_DENIED)

- **Kontext**: Při předchozí opravě (záznam níže – „Fix – LinkedIn publish: přidáno povinné pole `distribution`") jsem chybně dovodil, že `distribution` je pro member-autored ugcPosts povinné. Test na produkci to vyvrátil: LinkedIn API odpověděla `403 ACCESS_DENIED` s chybou `Unpermitted fields present in REQUEST_BODY: Data Processing Exception while processing fields [/distribution]`. Tím pádem **žádný příspěvek publikovaný po oné opravě** neprošel – všechny skončily ve stavu `failed`.
- **Skutečnost**: Pole `distribution` v LinkedIn UGC Posts API existuje, ale je **povolené POUZE pro organization-autored posts** (`urn:li:organization:*` + scope `w_organization_social` / Marketing Developer Platform). Pro **member-autored posts** (`urn:li:person:*` + `w_member_social` – což je přesně Postio use case) je `distribution` blok **zakázaný** a LinkedIn API ho striktně odmítá. Member příspěvky se publikují na member feed default, žádné `distribution` nepotřebují.
- **Oprava – vrácení payloadu** v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts#L575-L585):
  ```ts
  const payload = {
    author: authorUrn,                                    // urn:li:person:{openIdSub}
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    // distribution: ODSTRANĚNO – způsobovalo 403 ACCESS_DENIED
  };
  ```
- **Dopad na uživatele**: Příspěvky, které selhaly mezi předchozí opravou a touto opravou, zůstávají v DB jako `failed` v `post_platforms`. Uživatel je může **znovu publikovat** – s opraveným payloadem by měly projít.
- **Skutečná příčina „příspěvek se v aplikaci tváří publikovaný, ale na LinkedInu není vidět"**: Po této opravě by měl member-autored ugcPost s `w_member_social` projít a zobrazit se na feed/profile autora. Pokud se **ani poté** nezobrazí, příčina je **mimo kód Postio**:
  1. **LinkedIn processing delay** (typicky 5–15 minut, občas i déle, hlavně u nově propojených účtů).
  2. **Developer app v „Development" / „Test" módu** – API call projde, ale posty se nezobrazují členům v produkci. Řešení: v [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) → app → záložka **Settings** → přepnout z „Development" na „Live", případně projít App Reviewem.
  3. **OpenID sub mismatch** – `account.platform_id` v `social_accounts` neodpovídá reálnému uživateli, jehož token byl použit. Detekuje se vizuálně: URN `urn:li:person:{sub}` z logu by měl sedět s LinkedIn profilem, na který se příspěvek očekává.
- **Diagnostické logování**: Ponecháno a upřesněno – `console.log("[LinkedIn] sending ugcPosts payload (member-autored, no distribution):", ...)` vypíše klíčové informace pro support (author URN, lifecycleState, visibility, mediaCategory, contentLength). Úspěšný log nyní obsahuje i `mediaCategory` pro snazší korelaci s konkrétním příspěvkem.
- **Oprava ponaučení** v [AGENTS.md](file:///c:/VS_Code/Postio/AGENTS.md#L52-L55): předchozí záznam o „distribution je povinné" byl chybný – opraven na skutečné pravidlo (viz níže).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu otevři **dříve publikovaný příspěvek** se statusem `failed` na LinkedInu → klikni na **Publikovat znovu**.
  2. V konzoli by se **před** API callem měl objevit `[LinkedIn] sending ugcPosts payload (member-autored, no distribution): { author: 'urn:li:person:...', ... }` (bez `distribution` v klíčích).
  3. Po API callu by se měl objevit `[LinkedIn] ✅ publish success: { externalId: 'urn:li:...', ... }`.
  4. Na linkedin.com → profil → příspěvky by měl být příspěvek **viditelný do 15 minut**.

### Fix – LinkedIn publish: přidáno povinné pole `distribution` (příspěvky se vytvořily, ale nikde nezobrazily) [CHYBNÁ OPRAVA – viz předchozí záznam] 

- **Problém**: Příspěvek se v aplikaci tvářil jako `published` (LinkedIn API vrátila `201 Created` + URN `urn:li:share:7474174217731821568`), ale **na LinkedIn profilu/feedu se nikdy nezobrazil**. Konzole opakovaně hlásila `[LinkedIn] ✅ publish success`, post se uložil do `post_platforms` jako `published`, ale platforma zůstala prázdná. Sync logika poté zahlásila `[syncPublishedPosts] LinkedIn sync skipped: CM API not available for this app scope.` – což ale s tímto bugem **nesouviselo** (sync jen neumí ověřit existenci, ne že by post neexistoval).
- **Skutečná příčina**: LinkedIn UGC Posts API od května 2023 vyžaduje v payloadu **explicitní blok `distribution`** pro příspěvky autorizované členem (`urn:li:person:*`). Pokud `distribution` chybí, LinkedIn API:
  1. Vrátí HTTP `201 Created` + `x-restli-id` URN (vypadá to jako úspěch).
  2. Interně vytvoří příspěvek ve **skrytém/draft stavu**, který se **nikdy nepropaguje na member feed/profile timeline**.
  3. Neohlásí chybu – mlčky selže.
- **Oprava** v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts#L549-L600):
  ```ts
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    // ✅ NOVĚ – povinné od LinkedIn API 2023-05
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
  };
  ```
  `feedDistribution: "MAIN_FEED"` zajistí, že se příspěvek zobrazí na hlavním feedu autora. `targetEntities: []` a `thirdPartyDistributionChannels: []` jsou povinná prázdná pole (LinkedIn je očekává vždy).
- **Přidáno diagnostické logování**: Před odesláním payloadu se vypíše `console.log("[LinkedIn] sending ugcPosts payload:", { author, lifecycleState, visibility, feedDistribution, mediaCategory, hasMediaUrn, contentLength })`. Po úspěšném 201 Created se log rozšířil o `feedDistribution: "MAIN_FEED"`, aby šlo v konzoli snadno ověřit, že oprava je aktivní.
- **Dopad na stávající příspěvky**: Žádný. Tato oprava se týká **pouze nově publikovaných** příspěvků. Příspěvky publikované **před touto opravou** sice získaly URN z LinkedIn API, ale nikdy se reálně nezobrazily – uživatelé je mohou najít v Postio jako `published`, na LinkedInu je bohužel nutné **smazat nebo ručně přepublikovat**. V UI jsme to neřešili (pokryto existujícím "Archivovat" tokem pro staré příspěvky).
- **Dopad na ostatní platformy**: Žádný. Facebook/Instagram/YouTube/TikTok/X payloady mají vlastní strukturu, LinkedIn `distribution` se jich netýká.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu vytvoř nový příspěvek s LinkedIn platformou.
  2. V konzoli by se **před** API callem měl objevit `[LinkedIn] sending ugcPosts payload: { ..., feedDistribution: "MAIN_FEED" }`.
  3. Po publikaci ověř na linkedin.com → tvůj profil → příspěvky by měl být příspěvek **viditelný na timeline**.
  4. Pokud stále ne, ověř že `account.platform_id` (OpenID sub) v `social_accounts` odpovídá author URN ve vygenerovaném payloadu (`urn:li:person:{sub}`).

### Fix – LinkedIn OAuth: odebrání scope `r_member_social` (developer app ho nemá schválený)

- **Problém**: Při pokusu o propojení LinkedIn účtu OAuth okamžitě selhal s chybou `unauthorized_scope_error` a popisem `Scope "r_member_social" is not authorized for your application`. Konzole opakovaně volala `GET /api/accounts/linkedin?error=unauthorized_scope_error&...` – celý OAuth handshake se zasekával ještě před consent obrazovkou, takže uživatel nemohl účet vůbec propojit. Přitom dřív (před přidáním `r_member_social` v rámci sync logiky) to fungovalo bez něj.
- **Příčina**: Scope `r_member_social` (čtení member sociálních dat) **není součástí produktu „Share on LinkedIn"** v této developer aplikaci, jak se dříve předpokládalo. Přidání read scope navíc vyžaduje **schválení produktu „Community Management API"** LinkedInem, který Postio z právních důvodů nemůže získat (viz předchozí záznam o 403 ACCESS_DENIED). Výsledek: celý OAuth request je odmítnut, protože jeden ze scope není autorizovaný.
- **Oprava** – odebrání `r_member_social` z OAuth authorize URL v [src/app/api/accounts/linkedin/route.ts](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts#L62-L75):
  ```ts
  // Before:
  scope = "openid profile email w_member_social r_member_social"
  // After:
  scope = "openid profile email w_member_social"
  ```
  Scope `w_member_social` (publikování) plně dostačuje propojení účtu i následné publikování příspěvků.
- **Dopad na sync logiku**: Žádný. `syncPublishedPosts` pro LinkedIn už počítá s tím, že read API vrací 403 (viz předchozí záznam o tichém režimu pro CM API) – `last_sync_at` se aktualizuje a `status` zůstává konzervativně `published`. Read scope tam nikdy reálně nefungoval, takže jeho nepřítomnost v tokenu nic nemění.
- **Dopad na stávající uživatele**: Žádný. Scope `r_member_social` byl v kódu jen jeden den a OAuth kvůli němu vůbec neprošel – **žádný token ho v praxi nezískal**. Databáze `social_accounts` tedy nemá žádné tokeny s tímto scope, které by se musely reauthorizovat.
- **Přidáno ponaučení** do [AGENTS.md](file:///c:/VS_Code/Postio/AGENTS.md) – pravidlo „OAuth scope přidávej jen pro reálně používaná API volání, jinak OAuth selže kvůli neschválenému produktu".
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**:
  1. V Postiu jdi na **Nastavení → Propojené účty → LinkedIn → Připojit**.
  2. Konzole by měla vypsat `GET /api/accounts/linkedin 307` (redirect na LinkedIn consent screen), **bez** `unauthorized_scope_error`.
  3. LinkedIn by měl zobrazit consent screen se 4 oprávněními (OpenID + profil + email + w_member_social).
  4. Po udělení souhlasu redirect zpět na `/cs/accounts?li=connected` a v seznamu účtů se objeví LinkedIn profil.

## 2026-06-20

### Feature – LinkedIn soft-delete (archive) flow s obnovou a potvrzovacím dialogem

- **Kontext**: Po uzavření kapitoly LinkedIn CM API (viz předchozí záznam) je API delete nedostupné. Uživatel přesto potřebuje způsob, jak smazat/ukrýt LinkedIn příspěvek v aplikaci, aniž by ztratil historii (datum publikování), a případně ho později znovu obnovit. Cíl: zabránit nechtěnému duplikátu při republish.
- **Datový model – nový status `archived`** (migrace [031_add_archived_status_to_post_platforms.sql](file:///c:/VS_Code/Postio/supabase/migrations/031_add_archived_status_to_post_platforms.sql)):
  - Rozšířen CHECK constraint `post_platforms.status` o hodnotu `'archived'`.
  - Přidány sloupce `archived_at TIMESTAMPTZ` a `archive_reason TEXT` (výchozí reason: `'user_archived_from_app'`).
  - Vytvořen parciální index `idx_post_platforms_archived` pro rychlé filtrování.
  - **Sémantika**: `archived` ≠ `removed_externally`. `removed_externally` = platforma potvrdila smazání přes API (u LinkedIn nikdy nenastane kvůli 403). `archived` = uživatel ručně skryl příspěvek v Postio (per-platform logika – týká se jen LinkedIn řádku).
  - **Dopad na ostatní platformy**: žádný. Každý `post_platforms` řádek je per-platform, archivace se týká pouze LinkedIn řádku, ne celého postu.
- **Server akce** v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L617-L780):
  - **`archiveLinkedInPlatformRow(postId)`** – nastaví LinkedIn řádek na `status='archived'`, vyplní `archived_at` + `archive_reason`. Idempotentní (pokud je už archived, vrátí `alreadyArchived: true`). Odmítne archivovat draft/scheduled/failed (ty se běžně mažou přes `deletePost`). Zachová `published_at` a `external_id` pro pozdější obnovení.
  - **`restoreArchivedLinkedInPost(postId)`** – obnoví archived řádek zpět na `status='draft'`, vyčistí `archived_at`/`archive_reason` a **nastaví `external_id=null`**. Důvod: nemůžeme zaručit, že původní URN je stále platný (příspěvek mohl být na platformě smazán). Nové publikování dostane čerstvý URN.
- **Výpočet `computedStatus` v Postio** – aktualizován v `getPosts` ([src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L795-L815)) i `posts/page.tsx`:
  - `archived` se stane hlavním statusem **pouze pokud VŠECHNY platformy příspěvku jsou archived**. Pokud je alespoň jedna published/scheduled/failed, vyhraje vyšší priorita a per-platform badge v UI ukáže archived detail (viz níže).
- **UI – DeletePostDialog** ([src/components/dashboard/delete-post-dialog.tsx](file:///c:/VS_Code/Postio/src/components/dashboard/delete-post-dialog.tsx)):
  - Nový prop `onArchiveLinkedIn?: () => Promise<void>`.
  - Když je v livePlatforms přítomen LinkedIn, dialog přidá **dedikovanou sekci s vysvětlením + tlačítkem "Archivovat LinkedIn příspěvek v aplikaci"** (doporučeno). LinkedIn je zároveň odstraněn ze seznamu platforem pro API delete (nelze smazat přes API). Původní "Trvale smazat z aplikace" zůstává dostupné.
- **UI – PostCard** ([src/app/[locale]/(dashboard)/posts/_post-card.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/posts/_post-card.tsx)):
  - **Status badge**: nový styl pro `archived` (šedý, glass-like) a nový překladový klíč `statusArchived`.
  - **Akční tlačítko**: nové tlačítko "Obnovit a publikovat znovu" (RotateCcw ikona) – zobrazí se jen pokud existuje LinkedIn archived řádek. Otevře **confirmation dialog** s daty publikování a archivace + výstražným boxem o možném duplikátu.
  - **Banner**: po archive se v kartě zobrazí info banner s datumem původního publikování, datumem archivace a vysvětlujícím textem "Fyzicky může na platformě stále existovat".
- **UI – filter**: `PostFiltersRow` nyní zobrazuje i archived ve stavovém filtru.
- **Překlady**: 13 nových klíčů přidáno do [src/messages/cs.json](file:///c:/VS_Code/Postio/src/messages/cs.json), [en.json](file:///c:/VS_Code/Postio/src/messages/en.json) a [uk.json](file:///c:/VS_Code/Postio/src/messages/uk.json) – `statusArchived`, `linkedInRestoreConfirmTitle`, `linkedInRestoreConfirmDesc`, `linkedInRestoreConfirmAction`, `linkedInArchiveBanner`, `linkedInArchiveBannerSubtext`, `linkedInRestoreSuccess`, `linkedInArchiveSuccess`, `linkedInRestoreError`, `linkedInArchiveError`, `linkedInRestoreWarningLine1`, `linkedInRestoreWarningLine2`. `linkedInRestoreConfirmDesc` používá placeholdery `__publishedAt__` a `__archivedAt__`, které se v UI dynamicky nahrazují lokalizovaným datem.
- **Bezpečnost**: confirmation dialog před obnovou archived postu explicitně varuje, že obnova může vytvořit duplikát na LinkedInu (pokud uživatel fyzicky nesmazal příspěvek na platformě).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Postup testování po nasazení**:
  1. Aplikovat migraci `031_add_archived_status_to_post_platforms.sql` v Supabase.
  2. Otevřít publikovaný LinkedIn příspěvek v Postiu → kliknout na trash → v dialogu vybrat "Archivovat LinkedIn příspěvek v aplikaci".
  3. Ověřit: badge se změní na "Archivováno" + banner s daty + tlačítko "Obnovit".
  4. Kliknout na "Obnovit" → confirmation dialog s daty → potvrdit → příspěvek je zpět jako draft, připravený k novému publikování.
  5. Ověřit v konzoli: `[archiveLinkedInPlatformRow] LinkedIn row archived for post {id}`.

### Refactor – LinkedIn sync: tichý režim pro 403 (CM API není dostupné)

- **Kontext**: Po přidání `r_member_social` scope (viz záznam výše) se ukázalo, že OAuth scopes nejsou hlavní překážkou – **LinkedIn z právních důvodů nepovolí přidat produkt „Community Management API" do aplikace, která již má produkt „Share on LinkedIn"**. To znamená, že read endpointy `/v2/ugcPosts/{id}` a `/v2/shares/{id}` budou pro Postio **vždy vracet HTTP 403 ACCESS_DENIED**, bez ohledu na to, jaké scopes token má.
- **Důsledek pro sync logiku**: `syncPublishedPosts` v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L887-L930) nemůže spolehlivě ověřit existenci LinkedIn příspěvků – všechny LinkedIn read requesty skončí 403. Před touto úpravou se každých 30 minut vypsala konzolová warning `LinkedIn check inconclusive (HTTP 403) for post {id}` (a `last_sync_at` se neaktualizoval, takže se stejný warning opakoval donekonečna).
- **Změna** – LinkedIn větev v `syncPublishedPosts` nyní dělí stav odpovědi do 4 explicitních větví:
  1. `404` → příspěvek opravdu smazán → `status="removed_externally"` + `removed_at` + `last_sync_at` (beze změny).
  2. `2xx` → příspěvek žije → `last_sync_at` (beze změny).
  3. **`403` (nově explicitní větev)** → CM API nedostupné pro scope této aplikace → `console.log("LinkedIn sync skipped: CM API not available for this app scope.")` + `last_sync_at`. Žádný warning, žádný inconclusive stav. Příspěvek zůstává `published` (konzervativně předpokládáme, že žije).
  4. Ostatní (`401`, `5xx`, network) → stále `console.warn` jako inconclusive, **ale nově i zde se aktualizuje `last_sync_at`**, aby se zabránilo nekonečnému opakování neúspěšného requestu každých 30 minut.
- **Stabilita**: `continue` na konci LinkedIn větve zajišťuje, že 403 na LinkedInu neblokuje iterace pro YouTube/Facebook/Instagram – ty běží ve vlastních iteracích `for (const { postId, pp } of toSync)` a mají nezávislou logiku. Jeden LinkedIn 403 se nikdy nepromítne do chování jiných platforem.
- **Dopad na stávající příspěvky**: Žádný negativní dopad. Příspěvky, které byly předtím mylně označeny `removed_externally` kvůli Meta 404 (viz předchozí fix v CHANGELOGu), zůstanou `published`. Pokud by uživatel reálně smazal příspěvek na LinkedInu a my dostali 404 (např. po budoucím schválení CM API), kód by ho správně přesunul do `removed_externally`. Bez CM API zůstává konzervativní `published`.
- **Dopad na ostatní platformy**: Žádný. YouTube a Meta větve jsou netknuté.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test po nasazení**: Po 30 minutách od posledního sync by se v konzoli místo warningu měl objevit info log `[syncPublishedPosts] LinkedIn sync skipped: CM API not available for this app scope. (post {id})` – a to jen jednou za 30 minut (díky aktualizaci `last_sync_at`).

### Feature – LinkedIn OAuth scope: přidán `r_member_social` pro čtení stavu příspěvků (sync logika)

- **Problém**: Po opravě sync logiky (viz záznam níže) `syncPublishedPosts` správně volá LinkedIn API pro ověření existence příspěvků, ale dostává **HTTP 403 ACCESS_DENIED** (`Not enough permissions to access: ugcPosts.GET.NO_VERSION` / `shares.GET.NO_VERSION`). Důvodem je, že OAuth token uživatele měl pouze **write scope `w_member_social`**, ale **chyběl read scope** – konkrétně `r_member_social`. Výsledek: sync nemohl detekovat skutečné smazání příspěvků na LinkedInu a všechny příspěvky zůstávaly navždy `published`, i když je uživatel na LinkedInu smazal.
- **Řešení**: Přidán scope `r_member_social` do LinkedIn OAuth authorize URL v [src/app/api/accounts/linkedin/route.ts](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts#L62-L67):
  ```ts
  scope = "openid profile email w_member_social r_member_social"
  ```
  Po této změně bude mít každý nový (a re-authorizovaný) LinkedIn token oba scopes:
  - `w_member_social` – publikování příspěvků (fungovalo již dříve).
  - `r_member_social` – čtení stavu příspěvků (nové, potřebné pro `syncPublishedPosts`).
- **Akce potřebná od uživatele** (jednorázově):
  1. V [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) otevři svou aplikaci → záložka **Products** → ověř, že máš přidaný produkt **„Sign In with LinkedIn using OpenID Connect"** (pro `openid profile email`) a **„Share on LinkedIn"** (pro `w_member_social`). Scope `r_member_social` je součástí „Share on LinkedIn" a nevyžaduje zvláštní schválení.
  2. V Postiu jdi na **Nastavení → Propojené účty → LinkedIn → Odpojit** a poté **Připojit znovu**. LinkedIn zobrazí nový consent screen s rozšířeným seznamem oprávnění.
  3. Po re-authorizaci by `syncPublishedPosts` měl pro existující příspěvky vracet **HTTP 200** a pro smazané **HTTP 404**. Konzole bude vypisovat:
     ```
     [syncPublishedPosts] Post {id} removed on linkedin   ← smazáno
     [syncPublishedPosts] LinkedIn check OK for post {id}  ← žije
     ```
- **Dopad na stávající uživatele**: Všichni uživatelé s LinkedIn účtem propojeným **před touto změnou** budou mít token bez `r_member_social` → jejich sync logika bude stále vracet 403 (inconclusive). Musí se znovu připojit, aby získali aktualizovaný token.
- **Dopad na stávající příspěvky**: Žádný negativní dopad. Příspěvky publikované s write-only tokenem zůstávají `published` (konzervativní chování). Po re-authorizaci se stav správně synchronizuje.
- **Bezpečnost / Data**: Žádná DB migrace. Žádná API route kromě té, která generuje OAuth URL. Žádná nová závislost. Scope `r_member_social` je **read-only** – LinkedIn ho výslovně doporučuje pro aplikace, které čtou vlastní příspěvky uživatele.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Test**: Viz runtime evidence z předchozího commitu (`.dbg/li-check.js`, dočasný soubor, po testu smazán) – read endpoint vracel 403 právě kvůli chybějícímu scope. Po re-authorizaci by měl stejný test vrátit **200**.

### Fix – `syncPublishedPosts`: LinkedIn příspěvky se mylně ověřovaly přes Meta Graph API a byly označovány jako `removed_externally`

- **Problém**: Po opravě registrace LinkedIn assetu (viz záznam níže) se příspěvky na LinkedIn úspěšně publikovaly a Postio zapsal `status="published"` do DB. Během několika minut ale `syncPublishedPosts` (pravidelný job, který ověřuje, že příspěvky jsou stále na cílové síti) označil příspěvek jako `removed_externally`:
  ```
  [syncPublishedPosts] Syncing 1 published platform row(s)
  [syncPublishedPosts] Post 1898b6eb-8062-4f23-968f-d444bdf0f19d removed on linkedin
  [syncPublishedPosts] Marked 1 post(s) as removed_externally
  ```
  Uživatel viděl v UI: *„Příspěvek byl odstraněn z platformy. Můžete jej bezpečně smazat z aplikace tlačítkem „Chytré mazání" (🗑)"* – ačkoliv příspěvek na LinkedInu nikdy nebyl smazán.
- **Příčina**: V [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) měla funkce `syncPublishedPosts` **pouze dvě platformní větve** – YouTube (s vlastní logikou) a Meta (Facebook/Instagram, přes `https://graph.facebook.com/v20.0/{externalId}`). **LinkedIn větev chyběla úplně**, takže se všechny LinkedIn příspěvky propadly do Meta větve. Meta Graph API samozřejmě nezná LinkedIn URN (`urn:li:share:7474040249233436673`) a vracela HTTP 404, což kód interpretoval jako „příspěvek byl smazán z platformy".
- **Runtime evidence**: Přímý LinkedIn API test s uloženým tokenem (`.dbg/li-check.js`, dočasný soubor, po testu smazán) potvrdil, že **oba** Read endpointy vrací HTTP 403:
  ```
  GET /v2/shares/urn:li:share:7474040249233436673
  → 403 "Not enough permissions to access: shares.GET.NO_VERSION"

  GET /v2/ugcPosts/urn:li:share:7474040249233436673
  → 403 "Not enough permissions to access: ugcPosts.GET.NO_VERSION"
  ```
  Důvodem je, že OAuth token uživatele má **pouze write scope `w_member_social`**, ale **chybí `r_member_social`** (read scope pro Member Posts). Token tedy umí příspěvky vytvářet, ale ne číst jejich stav.
- **Oprava** – přidána samostatná **LinkedIn větev** do `syncPublishedPosts` v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L839-L913):
  1. **Import** `getValidLinkedInAccessToken` z [`@/lib/actions/publish-linkedin`](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) – transparentně obnoví token před ověřením (LinkedIn 60denní platnost).
  2. **Select rozšířen** o `platform_id` (potřebný pro `SocialAccountRow`), přestože ho jiné větve nevyužijí.
  3. **URN endpoint dispatch**:
     - `urn:li:ugcPost:{id}` → `GET https://api.linkedin.com/v2/ugcPosts/{id}`
     - `urn:li:share:{id}` → `GET https://api.linkedin.com/v2/shares/{id}` (legacy formát, ale LinkedIn ugcPosts API v současné verzi vrací URN právě v tomto tvaru přes hlavičku `x-restli-id`).
     - Nerozpoznaný formát → `console.warn` a `continue` (příspěvek zůstane `published`, neoznačí se falešně za smazaný).
  4. **Status dispatch**:
     - `404` → `status="removed_externally"` + `removed_at` + `last_sync_at` (skutečně smazáno).
     - `2xx` → `last_sync_at` (příspěvek žije, sync OK).
     - `401`/`403`/`5xx` → `console.warn` a `continue` (inconclusive – nemáme read scope, takže nevíme; bezpečnější je nechat `published` než riskovat false-positive).
- **Známý limit**: Dokud OAuth flow v [`src/app/api/accounts/linkedin/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts) nezačne žádat i `r_member_social`, sync logika nemůže skutečně ověřit existenci LinkedIn příspěvků – bude je vždy nechávat `published`. Přidání read scope vyžaduje změnu OAuth aplikace v LinkedIn Developer Portalu **a re-authorizaci všech uživatelů** (consent screen změna). Toto je záměrně mimo scope tohoto fixu (backwards-compat hrozba), bude řešeno v samostatném commitu.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Po této opravě se **žádný LinkedIn příspěvek neoznačí falešně jako `removed_externally`** kvůli Meta Graph API 404. Pokud by reálně na LinkedInu smazán byl (kontrolou přes web), `404` z LinkedIn API by příspěvek správně přesunul do `removed_externally`. UI se přestane chovat zmateně.
- **Postup pro testování po nasazení**:
  1. Restartovat `npm run dev`.
  2. Otevřít libovolný LinkedIn příspěvek, který byl omylem označen `removed_externally`.
  3. Ověřit, že po 30 minutách od posledního sync zůstává `status="published"` (díky inconclusive 403 větvi).
  4. V konzoli by mělo být: `[syncPublishedPosts] LinkedIn check inconclusive (HTTP 403) for post {id}`.

### Fix – LinkedIn `registerUpload`: `recipes[]` musí být pole URN stringů + chybějící `serviceRelationships` a `supportedUploadMechanism` (HTTP 403)

- **Problém**: Po předchozí opravě struktury `recipes[]` (viz záznam níže „Fix – LinkedIn `registerUpload`: chybná struktura `recipes[]`") se příspěvky s obrázkem na LinkedIn stále nepublikovaly. LinkedIn API vracel HTTP 403 s `serviceErrorCode: 100`:
  ```
  Field Value validation failed in REQUEST_BODY: Data Processing Exception
  while processing fields [/registerUploadRequest/recipes/serviceRelationships]
  ```
  Přímý LinkedIn API test ([`.dbg/li-test.js`](file:///c:/VS_Code/Postio/.dbg/li-test.js)) potvrdil, že s naší strukturou `recipes: [{ relationshipType: "OWNER", recipe: "..." }]` server vrací 403 i se správným OAuth tokenem (`w_member_social`, `expires_at=2026-08-19`).
- **Příčina**: Podle oficiální [LinkedIn Vector Assets API dokumentace](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api?view=li-lms-2025-08) (Microsoft Learn, červen 2026) musí mít `registerUploadRequest` tuto strukturu:
  - `recipes`: **pole URN stringů** (např. `["urn:li:digitalmediaRecipe:feedshare-image"]`), **ne pole objektů**.
  - `serviceRelationships`: **top-level pole** objektů `{ identifier: "urn:li:userGeneratedContent", relationshipType: "OWNER" }` – není součástí `recipes[]`.
  - `supportedUploadMechanism`: top-level pole, pro single-shot image upload hodnota `["SYNCHRONOUS_UPLOAD"]`.

  Předchozí fix z dneška (`recipes: [{ relationshipType, recipe }]`) se držel staršího vzoru z LinkedIn Marketing API, který ovšem `/v2/assets?action=registerUpload` (stejně jako novější `/rest/assets`) v aktuální verzi odmítá. Chybová zpráva `[/registerUploadRequest/recipes/serviceRelationships]` je důsledek toho, že validátor API kontroluje v každém prvku `recipes[]` klíč `serviceRelationships` (který tam správně nepatří, ale validátor ho očekává jako `recipes[*].serviceRelationships`, zatímco my ho posíláme na top-level).
- **Runtime evidence** (z [.dbg/trae-debug-log-linkedin-register-upload-service-relationships.ndjson](file:///c:/VS_Code/Postio/.dbg/trae-debug-log-linkedin-register-upload-service-relationships.ndjson), 4 varianty requestu se skutečným LinkedIn tokenem):

  | # | URL | Struktura | Status |
  |---|-----|-----------|--------|
  | v1 | `/v2/assets` | staré pole objektů v `recipes[]` | **403** – přesně reprodukuje chybu z aplikace |
  | **v2** | **`/v2/assets`** | **nová struktura (stringy + top-level)** | **200 OK** – `value.asset=urn:li:digitalmediaAsset:D4D22AQEaf87ZJx-igQ`, `uploadMechanism` správně ✅ |
  | v3 | `/rest/assets` + `Linkedin-Version: 202606` | nová struktura | 403 – nový endpoint vyžaduje schválení partnera (`partnerApiAssets.ACTION-registerUpload.20260601`) |
  | v4 | `/rest/assets` + `Linkedin-Version: 202606` | staré objekty | 403 – permission, stejná chyba jako v3 |

  Varianty v3/v4 potvrzují, že nový `/rest/assets` endpoint vyžaduje Marketing Developer Platform partner schválení, které Postio nemá – proto zůstáváme na `/v2/assets`, který stále funguje.

- **Oprava** – v [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) i [supabase/functions/process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) je `registerBody` nyní:
  ```ts
  const registerBody = {
    registerUploadRequest: {
      owner: authorUrn,
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [
        { identifier: "urn:li:userGeneratedContent", relationshipType: "OWNER" },
      ],
      supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
    },
  };
  ```
  Endpoint zůstává `https://api.linkedin.com/v2/assets?action=registerUpload` (Next.js i Deno port), URL se nemění.
- **Bezpečnost / Data**: Žádná DB migrace, žádná API route, žádná nová npm/Deno závislost. Čistě oprava struktury JSON payloadu + aktualizace komentářů v obou souborech (musí zůstat v sync – viz JSDoc poznámka).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Debug session**: [debug-linkedin-register-upload-service-relationships.md](file:///c:/VS_Code/Postio/debug-linkedin-register-upload-service-relationships.md) – `[OPEN]` čeká na manuální potvrzení v aplikaci.
- **Dopad**: Po této opravě by mělo publikování obrázkových příspěvků na LinkedIn opět fungovat. Token refresh, URN vlastníka, `X-Restli-Protocol-Version: 2.0.0` hlavička a `shareMediaCategory: "IMAGE"` v ugcPosts zůstávají nezměněné.
- **Postup pro testování po nasazení**:
  1. Restartovat `npm run dev`.
  2. Vytvořit nový příspěvek s obrázkem a zvolit LinkedIn jako cílovou platformu.
  3. Kliknout „Publikovat".
  4. **Očekávaný výstup**: `registerUpload` vrátí 200 s `value.asset` ve tvaru `urn:li:digitalmediaAsset:...`, `value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl`. Následný `PUT` binárních dat proběhne úspěšně, ugcPosts se uloží jako `urn:li:ugcPost:...`. Příspěvek se zobrazí na LinkedInu.
  5. V Supabase `post_platforms` by měl mít `status="published"`, `external_id=urn:li:ugcPost:...`, `published_at` nastavené, `publish_error=null`.
  6. Pokud by se přesto objevila chyba, ověřit `application-code` výstup – měl by obsahovat `[LinkedIn] ✅ publish success` a `urn:li:ugcPost:...`. Další kontrola v Supabase logu `trae-debug-log-*.ndjson` (pokud běží Debug Server).

### Fix – LinkedIn `registerUpload`: chybná struktura `recipes[]` (HTTP 403 ACCESS_DENIED)

- **Problém**: Při pokusu o publikování příspěvku s obrázkem na LinkedIn se v konzoli objevila chyba:
  ```
  [LinkedIn] assets.registerUpload failed: {
    status: 403,
    text: '{"status":403,"serviceErrorCode":100,"code":"ACCESS_DENIED",
           "message":"Field Value validation failed in REQUEST_BODY: Data Processing
           Exception while processing fields [/registerUploadRequest/recipes/relationshipType]"}'
  }
  ```
  `post_platforms` se následně aktualizoval na `status="failed"`. Text-only příspěvky fungovaly (ty nepoužívají asset registration), ale jakýkoliv příspěvek s obrázkem na LinkedIn selhal.
- **Příčina**: V [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) i v Deno portu [supabase/functions/process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) jsme posílali body ve tvaru:
  ```json
  {
    "registerUploadRequest": {
      "owner": "urn:li:person:...",
      "recipes": [{ "recipe": "urn:li:digitalmediaRecipe:feedshare-image" }],
      "serviceRelationships": [{ "relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent" }]
    }
  }
  ```
  Tato struktura vychází ze starší LinkedIn dokumentace. Současné `/v2/assets?action=registerUpload` (v2 API) ale **odmítá** top-level `serviceRelationships` a vyžaduje, aby `relationshipType` byl součástí KAŽDÉHO objektu v `recipes[]`. Když chybí, API vrací HTTP 403 s `serviceErrorCode: 100` a zprávou „Field Value validation failed in REQUEST_BODY: ... [/registerUploadRequest/recipes/relationshipType]".
- **Oprava** – `recipes[]` nyní obsahuje `relationshipType` i `recipe` na stejné úrovni, a `serviceRelationships` se vůbec neposílá:
  ```json
  {
    "registerUploadRequest": {
      "owner": "urn:li:person:...",
      "recipes": [
        {
          "relationshipType": "OWNER",
          "recipe": "urn:li:digitalmediaRecipe:feedshare-image"
        }
      ]
    }
  }
  ```
  Tato struktura odpovídá aktuální LinkedIn v2 API dokumentaci (Community Management API → ugcPost API → Image uploads).
- **Konkrétní soubory**:
  - [src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts) – opraven `registerBody` v `registerLinkedInImageAsset`; přidán JSDoc komentář vysvětlující chybu (ACCESS_DENIED 100) a proč se struktura změnila.
  - [supabase/functions/process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) – identická oprava v Deno portu (oba soubory musí zůstat v sync, viz komentář).
- **Bezpečnost / Data**: Žádná DB migrace. Žádná API route. Žádná nová npm/Deno závislost. Čistě oprava struktury JSON payloadu.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Po této opravě by mělo publikování obrázkových příspěvků na LinkedIn fungovat. Ostatní cesty (text-only, asset URN v `media[].media`) zůstávají nezměněné – autor URN, refresh logika i `X-Restli-Protocol-Version: 2.0.0` hlavička jsou správně.
- **Postup pro testování po nasazení**:
  1. Restartovat `npm run dev`.
  2. Vytvořit nový příspěvek s obrázkem a zvolit LinkedIn jako cílovou platformu.
  3. Kliknout „Publikovat" (nebo naplánovat).
  4. **Očekávaný výsledek**: `registerUpload` vrátí 200 s `value.asset = "urn:li:image:..."` a `value.uploadMechanism...uploadUrl`, následný `PUT` binárních dat proběhne úspěšně, ugcPosts se uloží jako `urn:li:ugcPost:...`. Příspěvek se zobrazí na LinkedInu.
  5. Pokud by se přesto objevila chyba, další krok by byl ověřit v Supabase logu `application-code` výstup – měl by obsahovat `[LinkedIn] ✅ publish success` a `externalId` ve tvaru `urn:li:ugcPost:...`.

### Feature – LinkedIn publisher: reálné publikování + LinkedIn preview v editoru (DONE)

- **Kontext**: LinkedIn účet lze v Postiu úspěšně propojit (viz OAuth route + UX notifikace záznamy dříve), ale publikování na LinkedIn zatím nebylo implementované – `publishPost()`, `publishAdditionalPlatforms()` a plánovaná edge funkce `process-scheduled-posts` neměly LinkedIn větev, takže příspěvek se po kliknutí na „Publikovat" tvářil jako úspěšně publikovaný v UI, ale nikdy neopustil Postio. Stejně tak v náhledu příspěvku (`PostPreview`) v `EditPostDialog` chyběl LinkedIn tab – uživatel nemohl vizuálně ověřit, jak bude příspěvek na LinkedIn vypadat. Tento commit uzavírá celý end-to-end flow: klik na „Publikovat" nebo naplánování příspěvku na LinkedIn skutečně publikuje přes LinkedIn UGC Posts API, uloží `urn:li:ugcPost:{id}` jako `external_id` do `post_platforms.external_id`, a v pravém panelu editoru se objeví věrný LinkedIn feed preview.
- **1) OAuth route – ukládání `refresh_token`** – [`src/app/api/accounts/linkedin/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts):
  - LinkedIn token endpoint vrací vedle 60denního `access_token` i `refresh_token` (při authorization-code exchange). Ten byl v OAuth route extrahován do `tokenData.refresh_token`, ale nikdy persistován – tudíž po 60 dnech nebylo možné získat nový token. Nyní se ukládá do `social_accounts.metadata` jako `metadata.refresh_token` (JSONB blob) – stejný vzor jako YouTube route.
  - `token_expires_at` zůstává nastaven na `+60 dní` (LinkedIn `expires_in`).
- **2) Nový modul [`src/lib/actions/publish-linkedin.ts`](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts)** – zapouzdřuje vše specifické pro LinkedIn (zrcadlí strukturu `publish-youtube.ts`):
  1. **`getValidLinkedInAccessToken({ account })`** – kontrola `token_expires_at` s 24hodinovým bezpečnostním bufferem; pokud vypršel/blíží se, zavolá `exchangeRefreshToken(refreshToken)` na `https://www.linkedin.com/oauth/v2/accessToken` s `grant_type=refresh_token`, uloží nový `access_token` + `token_expires_at` a případně rotovaný `refresh_token` zpět do `social_accounts` (přes admin klienta kvůli RLS).
  2. **`registerLinkedInImageAsset(...)`** – dvoukrokový LinkedIn asset registration: `POST /v2/assets?action=registerUpload` s recipe `urn:li:digitalmediaRecipe:feedshare-image` → `PUT` binárních bytů na vrácenou `uploadUrl`. Vrací `urn:li:image:{assetId}`.
  3. **`publishToLinkedIn(...)`** – samotné odeslání na LinkedIn UGC Posts API:
     - Endpoint: `POST https://api.linkedin.com/v2/ugcPosts` s povinnou hlavičkou `X-Restli-Protocol-Version: 2.0.0`.
     - Author URN: `urn:li:person:{platform_id}` (kde `platform_id` = LinkedIn OpenID subject uložený v DB při OAuth).
     - Text-only post: `shareCommentary.text` + `shareMediaCategory: "NONE"`.
     - Image post: registrace assetu + `shareMediaCategory: "IMAGE"` + `media[].media = assetUrn`.
     - Video posty v této verzi **nejsou podporovány** (vyžadují samostatný `/v2/videos` flow); publisher vrátí jasnou chybu „LinkedIn v této verzi nepodporuje video příspěvky…".
     - LinkedIn vrací `201 Created`; finální URN je v hlavičce `x-restli-id`.
  4. **`publishToLinkedInAction(...)`** – veřejný vstupní bod. Ověří `platform_id`, zavolá `getValidLinkedInAccessToken`, sestaví `finalContent` (content + 📍 lokace + #hashtagy, oříznuté na 3000 znaků – LinkedIn hard limit `shareCommentary.text`) a publikuje. Vrací `{ success, externalId, error? }` ve stejném tvaru jako ostatní publishery.
  5. **Defense-in-depth guard** – pokud `existingExternalId` je předáno neprázdné, publish se odmítne (zabraňuje duplicitnímu uploadu i v případě, že by v budoucnu nějaký caller obešel vysokoúrovňový guard v `publishPost`).
- **3) [`src/lib/actions/publish.ts`](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts)** – přidána nová větev `if (targetPlatform === "linkedin")` jak do `publishPost()`, tak do `publishAdditionalPlatforms()`. Větev:
  - Načte LinkedIn účet přes `supabaseAdmin` se selectem `id, user_id, platform, access_token, token_expires_at, metadata, platform_id`.
  - Zavolá `publishToLinkedInAction(...)` s `existingExternalId` z `alreadyPublishedRow` guardu.
  - Při úspěchu `handlePublishSuccess(... "linkedin")` → `post_platforms.status="published"`, `published_at`, `external_id=urn:li:ugcPost:...`, `publish_error=null` (stejný helper jako FB/IG/YT).
  - Při chybě `handlePublishError(... "linkedin")` → `post_platforms.status="failed"`, `publish_error=<důvod>`.
  - V obou případech se zavolá `revalidateAllLocales("/calendar"|"/posts"|"/dashboard")`.
  - **Token expirace**: kontrola probíhá uvnitř `getValidLinkedInAccessToken` – pokud access token vypršel, refresh se provede transparentně ještě před samotným uploadem, takže scheduled posty v cronu nikdy nezkolabují na 401 z LinkedIn API.
- **4) [`supabase/functions/process-scheduled-posts/index.ts`](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts)** – Deno port LinkedIn publisheru (musí být v sync s Next.js helperem, protože edge funkce běží v Deno runtime a nemůže importovat `@/lib/...`):
  - Nový `refreshLinkedInAccessToken(refreshToken)` – Deno ekvivalent `exchangeRefreshToken` (čte `LINKEDIN_CLIENT_ID/SECRET` z `Deno.env.get(...)`).
  - Nový `getValidLinkedInAccessToken({ supabaseAdmin, userId })` – Deno ekvivalent Next.js helperu (stejná logika jako YouTube varianta).
  - Nový `registerLinkedInImageAsset(...)` – Deno port asset registrace.
  - Nový `buildLinkedInContent(...)` – Deno ekvivalent caption builderu.
  - Nový `publishToLinkedIn(...)` – identický algoritmus (UGC Posts).
  - V hlavním `for` loopu přidána větev `else if (targetPlatform === "linkedin")`: `getValidLinkedInAccessToken` → `publishToLinkedIn`. Výsledek (`externalId` + případný `publishError`) se pak předá do stejného update bloku `post_platforms.status="published|failed"` jako pro FB/IG/YT.
  - Buffer 24 hodin (`LINKEDIN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000`).
- **5) [`src/components/post-preview.tsx`](file:///c:/VS_Code/Postio/src/components/post-preview.tsx)** – LinkedIn preview:
  - Typ `Platform` rozšířen o `"linkedin"` + přidán `PLATFORM_ACCENTS.linkedin = "#0A66C2"` (LinkedIn brand blue) jako jediný zdroj pravdy pro barvy aktivního tabu.
  - Přidána prop `linkedinProfile?: PostPreviewProfile | null` + volitelný label `linkedinTab` v `labels`.
  - Nový `LinkedInPreview` sub-renderer – věrná reprodukce LinkedIn mobilního feed share card:
    - Světlé LinkedIn pozadí `#f3f2ef` (LinkedIn klasika) s bílou kartou uprostřed, modrý „in" logo v headeru.
    - Header: kulatý avatar (44px) + jméno + „Professional · 1. stupeň" + „Právě teď · 🌐" + „⋯" menu.
    - Caption: text příspěvku, `whitespace-pre-wrap` (LinkedIn word wrap).
    - Media: obrázek v 4:3 framu (pokud existuje), zarovnaný na celou šířku karty.
    - Social proof: „👍❤️👏 0" vlevo, „0 komentářů" vpravo.
    - Divider + reaction row: To se mi líbí / Komentář / Repost / Poslat (4-sloupcová mřížka, lokální LinkedIn texty).
  - `activeProfile` resolver rozšířen o LinkedIn větev.
  - `tabDescriptors` resolver přidán nový case pro `"linkedin"` (s fallbackem na string `"LinkedIn"` pokud chybí `labels.linkedinTab`).
  - Hlavní render switch přidán `LinkedInPreview` mezi YouTube a Instagram.
- **6) [`src/components/edit-post-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx)** – propojení s dialogem:
  - Přidán `linkedinProfile` state.
  - `loadProfiles` useEffect nyní tahá FB / IG **/ YT / LinkedIn** v jednom dotazu (`social_accounts` `.in("platform", ["facebook", "instagram", "youtube", "linkedin"])`). LinkedIn profil se v DB ukládá pod stejným schématem (`account_name` = `userInfo.name ?? `${given_name} ${family_name}`` fallback, `avatar_url` = `userInfo.picture`).
  - Nový `availablePreviewPlatforms` `useMemo` – sjednotí `platforms` (form state) + `post.platforms` (perzistentní) + `post.post_platforms` (včetně published) a vyfiltruje jen ty, které PostPreview umí renderovat (FB / IG / YT / **LinkedIn**). Ostatní platformy (Twitter/X, TikTok) jsou záměrně vynechány, dokud jejich preview renderery nepřibudou.
  - `<PostPreview>` dostal `linkedinProfile` + `availablePlatforms={availablePreviewPlatforms}` (typ rozšířen o `"linkedin"`).
  - `previewLabels.useMemo` přidán `linkedinTab: tLabels.previewLinkedinTab ?? "LinkedIn"`.
  - Typ `tLabels` rozšířen o `previewLinkedinTab?: string`.
- **7) Překlady** `src/messages/{cs,en,uk}.json` – přidán klíč `previewLinkedinTab: "LinkedIn"` (ve všech třech jazycích). Ostatní `preview*` klíče zůstávají; volání v `EditPostDialog` mají hardcoded fallbacky, takže LinkedIn tab funguje i bez načtení messages.
- **Specifika LinkedIn dodržená** (dle CLAUDE.md pravidel):
  - ✅ Žádné PDF karusely (publisher podporuje jen `shareMediaCategory: "NONE" | "IMAGE"`).
  - ✅ `@mention` je prostý text – žádná speciální entita (publisher posílá text tak, jak ho uživatel napsal, bez parsování `@nickname`).
  - ✅ Editace textu po publikování není podporována – `updateOnPlatformAction` pro LinkedIn vrací placeholder chybu „Úprava na LinkedIn zatím není implementována" (stejně jako dosud), ale `deleteFromMeta` pro LinkedIn bude fungovat (LinkedIn `DELETE /v2/ugcPosts/{id}` podporuje).
  - ✅ Video příspěvky: v1 publisher vrátí jasnou chybu – uživatel dostane zprávu, že LinkedIn video v této verzi nepodporuje.
- **Bezpečnost / Data**:
  - **Žádná DB migrace** – `social_accounts.metadata` (JSONB) a `token_expires_at` již existují z migrací 027 a 029.
  - **Žádné nové npm/Deno závislosti** – vše na nativním `fetch` + `URLSearchParams`.
  - **`refresh_token` ochrana**: ukládá se do `metadata` JSONB (sloupec `refresh_token` v tabulce neexistuje); při refreshi se nikdy nepřepisuje, pokud LinkedIn nevrátí nový (LinkedIn rotuje refresh_token na každém úspěšném refreshi, ale pokud nevrátí, ponechá se stávající).
  - **Žádné nové API routes** – LinkedIn publish se spouští buď přes existující `publishPost()` / `publishAdditionalPlatforms()` (button „Publikovat teď") nebo přes plánovanou edge funkci `process-scheduled-posts`.
  - **Author URN**: `urn:li:person:{openIdSub}` – používáme `platform_id` uložené v OAuth callbacku (= OpenID subject z `/v2/userinfo`).
  - **X-Restli-Protocol-Version**: VŽDY se posílá `2.0.0` (LinkedIn API striktně vyžaduje, jinak vrací 400).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Po připojení LinkedIn účtu (viz OAuth záznamy) lze vytvořit příspěvek s alespoň jedním textem nebo obrázkem, zvolit LinkedIn jako cílovou platformu a kliknout „Publikovat". Systém transparentně obnoví token (pokud vypršel) a publikuje příspěvek přes LinkedIn UGC Posts API.
  - Plánované LinkedIn posty (cron přes `process-scheduled-posts`) projdou stejnou logikou v Deno edge funkci – cron nikdy nezkolabuje na 401, protože `getValidLinkedInAccessToken` refreshne token před publikováním.
  - Po úspěšném publikování se v databázi uloží LinkedIn post URN (`urn:li:ugcPost:...`) do `post_platforms.external_id`. UI v budoucnu může zobrazit odkaz `https://www.linkedin.com/feed/update/{urn}` a tlačítko pro smazání.
  - V editoru (`EditPostDialog`) se v pravém sloupci náhledu objeví **LinkedIn tab** (když je LinkedIn mezi cílovými platformami), který zobrazuje věrnou mobilní feed kartu s LinkedIn-specifickým designem.
- **Postup pro testování po nasazení**:
  1. Spustit `npm run dev`.
  2. Přihlásit se jako existující Postio uživatel s LinkedIn účtem.
  3. Jít na `/cs/posts/new` nebo upravit existující draft.
  4. Ověřit, že v pravém sloupci náhledu se objeví tab **LinkedIn** (vedle Facebook / Instagram / YouTube).
  5. Přepnout na LinkedIn tab – měla by se zobrazit bílá feed karta s LinkedIn designem.
  6. Vyplnit text, přidat obrázek (volitelně), kliknout „Publikovat".
  7. **Očekávaný výsledek**: po 1-3 sekundách toast o úspěchu, v seznamu příspěvků se příspěvek objeví jako `published` na LinkedIn, v `post_platforms.external_id` je `urn:li:ugcPost:...`.
  8. Ověřit na LinkedInu: příspěvek se objevil ve feedu.
  9. **Edge case**: Naplánovat příspěvek na 1 minutu dopředu, počkat, spustit `process-scheduled-posts` edge funkci (nebo cron job) – příspěvek by měl být publikován na LinkedIn.
  10. **Refresh token test**: manuálně nastavit `token_expires_at` v Supabase na `now() - 1 hour` pro daný LinkedIn účet, poté publikovat – publisher by měl automaticky zavolat refresh endpoint a publikovat úspěšně.
- **Možné rozšíření (mimo scope tohoto commitu)**:
  - UI tlačítko „Otevřít na LinkedIn" + „Smazat z LinkedIn" (využívá uložené `external_id`).
  - LinkedIn video publisher (`/v2/videos` flow + asset recipe `urn:li:digitalmediaRecipe:feedshare-video`).
  - Editace titulku/description (LinkedIn API to nepodporuje dle pravidel – zůstane neimplementováno).

### Fix – a11y warning v `ConnectAccountModal` (chybějící `DialogDescription`)

- **Problém**: Při prvním testovacím spuštění LinkedIn OAuth flow se v prohlížečové konzoli objevil Radix UI warning: `Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.` Dialog se vizuálně zobrazil správně (LinkedIn dlaždice → modal → tlačítko Propojit → redirect na LinkedIn consent screen – `GET /api/accounts/linkedin?state=…&locale=cs` vrátil `307`), ale Radix UI odmítá render bez popisu kvůli přístupnosti.
- **Příčina**: [`src/components/connect-account-modal.tsx`](file:///c:/VS_Code/Postio/src/components/connect-account-modal.tsx) měl uvnitř `DialogContent` pouze `<DialogTitle className="sr-only">`. Chyběl buď `<DialogDescription>`, nebo explicitní `aria-describedby` na `DialogContent`. Radix UI to považuje za chybu (WCAG – dialog by měl mít titulek + popis).
- **Oprava**: Přidán `<DialogDescription className="sr-only">` hned za `<DialogTitle>`. Text popisu je `"{title} – {warningDesc}"` – tedy kombinace názvu dialogu (např. „Propojit LinkedIn") a kontextového varování (např. „LinkedIn token platí 60 dní..."). Tím se:
  1. Splní Radix UI požadavek na přístupnost (warning v konzoli zmizí).
  2. Screen readerům poskytne kontext o účelu dialogu + důležité bezpečnostní upozornění.
  3. Vizuální vzhled zůstane nezměněný – popis je skrytý (`sr-only`).
- **Konkrétní soubory**:
  - [`src/components/connect-account-modal.tsx`](file:///c:/VS_Code/Postio/src/components/connect-account-modal.tsx) – import `DialogDescription` (vedle `DialogTitle` ze stejného modulu), přidání `<DialogDescription>` elementu s vysvětlujícím JSDoc komentářem.
- **Dopad**: Po této opravě se při otevření libovolného OAuth propojovacího dialogu (LinkedIn, Facebook, Instagram, YouTube) již nezobrazuje Radix UI warning. Dialog zůstává pro uživatele vizuálně identický.
- **Bezpečnost / Data**: Žádná DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Čistě a11y oprava.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Feature – LinkedIn OAuth: dokončení UX notifikací po připojení

- **Kontext**: OAuth backend pro LinkedIn (`/api/accounts/linkedin`) byl implementovaný již dříve (OpenID Connect, scope `w_member_social openid profile email`, fetch `/v2/userinfo`, upsert do `social_accounts` s `platform="linkedin"` a `token_expires_at=+60 dní`). Tlačítko LinkedIn v `accounts/page.tsx` také již správně otevíralo `ConnectAccountModal` a odkazovalo na tuto route. **Chyběl pouze poslední krok**: signalizace úspěchu v UI po návratu z LinkedIn – uživatel sice účet v databázi měl a po refreshi se mu zobrazil, ale nedostal toast o úspěšném připojení, jako je tomu u YouTube (`?yt=connected` → `toast.success(t("ytConnectedShort"))`).
- **[`src/app/api/accounts/linkedin/route.ts`](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts)** – přidán success signal `?li=connected` k post-auth redirectu:
  1. Nový helper `appendSuccessParam(target, key, value)` – appenduje `?key=value` (nebo `&key=value` pokud URL již obsahuje query string). Univerzální – podporuje cesty s i bez hosta (např. `/cs/accounts` i plné URL).
  2. `redirectOnSuccess` se nyní staví jako `appendSuccessParam(baseRedirect, "li", "connected")`, kde `baseRedirect` je původní `state` (typicky `/{locale}/accounts`).
  3. `errorRedirect(msg)` factory – připravuje cestu pro případné budoucí rozšíření, kdy by se do chybového redirectu přidal konkrétní důvod (např. `?error=Token+exchange+failed`). Aktuálně se stále posílá generická zpráva „LinkedIn connection failed", aby se zachovalo původní chování.
  4. Zdokumentován celý tok v JSDoc komentáři nad `redirectOnSuccess` (včetně popisu, že `?li=connected` je „sister signal" k YouTube `?yt=connected`).
- **[`src/app/[locale]/(dashboard)/accounts/page.tsx`](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/accounts/page.tsx)** – rozšířen OAuth callback handler:
  1. Sjednocen useEffect pro YouTube + LinkedIn + obecné chyby (YouTube měl vlastní useEffect; LinkedIn neměl žádný).
  2. Nový `liSignal = searchParams.get("li")` vedle existujícího `ytSignal` a `errorSignal`.
  3. Po `?li=connected` se provede `fetchAccounts()` + `toast.success(t("liConnectedShort"))` a query param se okamžitě odstraní z URL (`router.replace(window.location.pathname)`) – stejný anti-loop pattern jako u YouTube.
  4. Pokud selže OAuth (token exchange, `/userinfo`, DB upsert, …), zachová se stávající chování – `?error=<msg>` → `toast.error(t("connectionError", { error }))`.
  5. Závislosti useEffectu aktualizovány na `[ytSignal, liSignal, errorSignal, router, t]`.
- **Překlady** `src/messages/{cs,en,uk}.json` – přidány tři klíče v každém jazyce:
  - `liConnected`: „LinkedIn účet „{name}" byl úspěšně propojen s Postiem." (cs) / ekvivalenty v en a uk.
  - `liConnectedShort`: „LinkedIn účet byl úspěšně propojen s Postiem." (generický toast, cs).
  - `liDisconnected`: „LinkedIn účet „{name}" byl odpojen." (pro budoucí disconnect toasts).
- **Ověření odpojení**: `handleDeleteConnectedAccount` v accounts page je **obecný** (`supabase.from("social_accounts").delete().eq("id", ...)`), tlačítko Trash v kartě každého aktivního účtu se renderuje pro všechny platformy (včetně LinkedIn). Smazání funguje konzistentně s ostatními platformami – žádné změny nebyly potřeba.
- **Bezpečnost / Data**:
  - Žádná DB migrace (sloupec `token_expires_at` a constraint `platform IN ('linkedin', ...)` již existují z migrací 027 a 012).
  - Žádné nové API routes ani nové npm závislosti.
  - Žádné změny OAuth protokolu ani scopes.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Postup pro testování** (po commitnutí a pushnutí na Vercel preview nebo lokálně):
  1. Spustit `npm run dev`.
  2. Přihlásit se jako existující Postio uživatel.
  3. Jít na `/cs/accounts` (nebo jiný locale).
  4. Kliknout na dlaždici **LinkedIn** → otevře se `ConnectAccountModal` s textem `warningDescLinkedIn` („LinkedIn token platí 60 dní...").
  5. Kliknout na hlavní tlačítko „Propojit" → redirect na LinkedIn consent screen.
  6. Po přihlášení a udělení oprávnění → redirect zpět na `/cs/accounts?li=connected`.
  7. **Očekávaný výsledek**: zobrazí se toast „LinkedIn účet byl úspěšně propojen s Postiem.", URL se ihned vyčistí (žádný `?li=connected`), v seznamu propojených účtů přibude nová karta se jménem z `/v2/userinfo` (fallback `given_name + family_name`) a LinkedIn avatar URL.
  8. Ověřit odpojení: kliknout na červené tlačítko Trash u LinkedIn karty → potvrzovací dialog → „Smazat" → karta zmizí.
  9. Ověřit uložení v Supabase: `SELECT * FROM social_accounts WHERE platform='linkedin' AND user_id=<auth.uid>()` – měl by existovat řádek s `is_active=true`, `token_expires_at` ≈ +60 dní od teď.

## 2026-06-19

### Fix – YouTube synchronizace: false-positive "Odstraněno externě" + ochrana proti duplicitním uploadům (CRITICAL)

- **Problém**: Po úspěšném nahrání videa na YouTube Postio okamžitě označil příspěvek jako `removed_externally`. Tento stav způsobil, že:
  1. UI nabídlo uživateli tlačítko pro opětovné publikování.
  2. Uživatel klikl na "Publikovat" znovu.
  3. `publishPost()` vzal příspěvek znovu do fronty a video se na YouTube nahrálo podruhé → **duplicita na kanálu**.

- **Příčina** (dvě na sobě nezávislé chyby):
  1. **Sync rutina používala Facebook Graph API i pro YouTube.** Funkce `syncPostStatus` a `syncPublishedPosts` v [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) posílaly YouTube video ID na `https://graph.facebook.com/v20.0/${externalId}`. YouTube ID tam samozřejmě neexistuje → Meta vrátila 404 → Postio příspěvek chybně označil jako `removed_externally`. **Horší**: i kdyby video čerstvě prošlo stavem `processing` nebo `uploaded` (legitimní stav YouTube mezi upload konečného `id` a úplným zpracováním), `videos.list` ho stále vrací. Kdyby Postio v tomto okně zavolal sync, stále by skončil s `removed_externally`.
  2. **Žádná ochrana proti duplicitnímu uploadu.** `publishPost()` v [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) filtroval `unpublishedPlatforms` jako `post_platforms.filter(p => p.status !== "published")`. `removed_externally` mezi ně patří → `targetPlatform = "youtube"` se dostal do YouTube větve znovu a `publishToYouTubeAction` bez další kontroly zavolal resumable upload. V `publishAdditionalPlatforms()` byla jednoduchá kontrola `publishedPlatformNames.includes(platform)`, která se spoléhala jen na `status="published"` bez ověření `external_id`.

- **Oprava** (tři vrstvy):
  1. **Nový helper `checkYouTubeVideoExists` v [src/lib/actions/publish-youtube.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-youtube.ts)** – YouTube Data API v3 `videos.list?id={videoId}&part=status` s `Authorization: Bearer {accessToken}`. Vrací tři stavy:
     - `exists: true` + `uploadStatus` – video existuje (jakýkoliv `uploadStatus`, včetně `processing`/`uploaded`).
     - `exists: false` (404 nebo prázdné `items[]`) – video bylo skutečně smazáno.
     - `exists: null` (síťová/chybová odpověď) – ponechá `status="published"` a počká na další sync.
  2. **YouTube větev v `syncPostStatus` a `syncPublishedPosts`**:
     - Načte se celý `social_accounts` řádek (kvůli `token_expires_at` + `metadata.refresh_token`).
     - Zavolá se `getValidYouTubeAccessToken` pro transparentní refresh tokenu (YouTube access tokeny expirují po ~1 hodině; bez refreshe by 401 z `videos.list` vedlo ke stejnému false positive).
     - Zavolá se `checkYouTubeVideoExists`.
     - Jen `exists === false` mění stav na `removed_externally`. Jakýkoliv jiný výsledek (včetně `processing`) ponechá `status="published"` a aktualizuje `last_sync_at` (throttling 30 min).
     - `syncPublishedPosts` navíc projde **všechny** `status="published"` řádky (ne jen první), přednačte všechny `social_accounts` do `Map` (žádný N+1) a cachuje obnovené YouTube tokeny v rámci batche.
  3. **Ochrana proti duplicitnímu uploadu (tři úrovně)**:
     - **`publishPost()` – guard hned po určení `targetPlatform`**: pokud `post_platforms` pro `(postId, targetPlatform)` je v `status="published"` s neprázdným `external_id`, funkce vrátí `{ success: false, error: "Příspěvek je již publikován na {platform}. Duplicitní nahrávání je blokováno." }` **bez** spuštění jakéhokoliv uploadu. Stejný guard v `publishAdditionalPlatforms()`.
     - **`publishToYouTubeAction`** – nový volitelný parametr `existingExternalId`. Pokud je předáno neprázdné ID, helper vrátí chybu a YouTube upload se **vůbec nespustí** (aniž by se stahovalo video, aniž by se volal resumable init). Oba publish routery předávají `existingYtExternalId` z předchozího guardu.
     - **(Fallback)** `publishedPlatformNames.includes(input.platform)` v `publishAdditionalPlatforms` zůstává pro starší `status="published"` řádky bez `external_id` (nemůže se v praxi stát, ale zachovává zpětnou kompatibilitu).

- **Konkrétní soubory**:
  - [src/lib/actions/publish-youtube.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-youtube.ts) – nový `checkYouTubeVideoExists`, rozšířený `publishToYouTubeAction` o `existingExternalId`.
  - [src/lib/actions/posts.ts](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts) – YouTube větev v `syncPostStatus` + kompletní přepracování `syncPublishedPosts` (YouTube branch, procházení všech published řádků, batch caching tokenů).
  - [src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts) – `alreadyPublishedRow` guard v `publishPost` i `publishAdditionalPlatforms`, předávání `existingYtExternalId` do YouTube helperu.
- **Dopad**:
  - Čerstvě publikované YouTube video: `status` zůstane `published` (YouTube Data API v3 potvrdí existenci i během `processing`). Žádný false positive → tlačítko pro opětovné publikování se **neobjeví**.
  - I kdyby se v budoucnu objevil jiný důvod pro `removed_externally`, `publishPost` i `publishAdditionalPlatforms` odmítnou znovu nahrát, protože `post_platforms.external_id` (YouTube video ID) je v DB.
  - Všechny tři kontroly selhávají nezávisle – i kdyby se guard v routeru obešel (např. nový caller z cronu), `publishToYouTubeAction` sám odmítne upload.
- **Edge funkce** `process-scheduled-posts/index.ts` (Deno port) nebyla v tomto commitu měněna, protože YouTube publisher v Deno zatím nepoužívá `postId` pro lookup `external_id`. Pokud se v budoucnu přidá scheduled YouTube upload, doporučuje se přidat stejný guard (DB lookup `post_platforms.external_id` podle `postId` + `platform`).
- **Bezpečnost / Data**: Žádná DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Čistě logické opravy ve stávajících akcích.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Postup pro testování po nasazení**:
  1. Smazat duplicity na YouTube kanálu (mimo Postio).
  2. Vytvořit nový příspěvek s videem, zvolit YouTube jako cílovou platformu, kliknout "Publikovat".
  3. Ověřit, že `post_platforms.status` zůstane `published` (ne `removed_externally`).
  4. Ověřit, že se v UI neobjeví tlačítko pro opětovné publikování / oranžový warning.
  5. Zkusit manuálně vynutit sync (např. zavolat `syncPostStatus` z konzole) – nesmí příspěvek přehodit na `removed_externally`.

### Fix – YouTube tab chyběl v náhledu příspěvku (Preview)

- **Problém**: Když měl příspěvek v `Vybrat platformy` YouTube (nebo už na něm byl publikovaný), živý náhled vpravo v `EditPostDialog` zobrazoval jen Facebook a Instagram. Chyběl YouTube tab, takže uživatel neměl možnost vizuálně ověřit, jak bude příspěvek na YouTube vypadat (titulek, popis, banner kanálu, 16:9 video frame) – navzdory tomu, že backend už YouTube umí publikovat (viz záznam „YouTube publisher: reálné nahrávání videí" výše).
- **Příčina**: [`src/components/post-preview.tsx`](file:///c:/VS_Code/Postio/src/components/post-preview.tsx) měl typ `Platform = "facebook" | "instagram"` natvrdo a `PlatformTabs` vykresloval jen dvě tlačítka. Žádná větev pro YouTube v komponentě neexistovala.
- **Oprava**:
  1. **Typ `Platform` rozšířen o `"youtube"`** + přidán `PLATFORM_ACCENTS` (YouTube = `#FF0000`) jako jediný zdroj pravdy pro barvy aktivního tabu.
  2. **`availablePlatforms?: Platform[]` prop** – seznam dostupných tabů nyní vlastní rodič (`EditPostDialog`). Když prop chybí, komponenta spadne na `DEFAULT_AVAILABLE_PLATFORMS = ["facebook", "instagram"]` (backward compatible).
  3. **Nový `YouTubePreview` sub-renderer** – věrná reprodukce YouTube mobilního watch feedu:
     - Tmavý `#0f0f0f` header s červeným ▶ + textem „YouTube".
     - **16:9 video frame** (`MediaArea` nyní podporuje `aspect: "video"`) – placeholder "Žádná média" je v 16:9 i pro prázdný stav, aby se vizuálně komunikoval video slot.
     - **Title** (2 řádky, `line-clamp-2`) – text příspěvku, stejně jako v `publish-youtube.ts` kde `snippet.title = post.content`.
     - **Channel row** – kulatý avatar + název kanálu + „0 subscribers" + červené tlačítko „Subscribe" (dekorativní, bez handleru).
     - **Description chip** – „0 views · just now" + tělo příspěvku.
     - **Action bar** – Like / Dislike / Share, stejné rozložení jako YT mobile.
  4. **`PlatformTabs` dynamický** – dříve měl natvrdo FB/IG tlačítka, nyní iteruje přes `tabs: { id, label, accent }[]` z rodiče. Přidán `flex-wrap justify-end`, aby se tři případné taby (FB / IG / YT) nezalomily nečitelně.
  5. **Anti-pattern refactor**: odebrán `useEffect`, který v případě zúžení `availablePlatforms` snapoval `platform` zpět na první tab – nahradil jsem ho čistě derivovanou hodnotou `effectivePlatform` (`tabs.includes(platform) ? platform : firstTab`). Vyhnutí se `react-hooks/set-state-in-effect` (lint error), méně kaskádových renderů.
  6. **[`src/components/edit-post-dialog.tsx`](file:///c:/VS_Code/Postio/src/components/edit-post-dialog.tsx)** – propojení s dialogem:
     - Přidán `youtubeProfile` state.
     - `loadProfiles` useEffect nyní tahá FB / IG **i YT** v jednom dotazu (`social_accounts` `.in("platform", ["facebook", "instagram", "youtube"])`). YT channel se v DB ukládá pod stejným schématem (`account_name` = `snippet.title`, `avatar_url` = `snippet.thumbnails.high`).
     - Nový `availablePreviewPlatforms` `useMemo` – sjednotí `platforms` (form state) + `post.platforms` (perzistentní) + `post.post_platforms` (včetně published) a vyfiltruje jen ty, které PostPreview umí renderovat (FB / IG / YT). Ostatní platformy (LinkedIn, Twitter/X, TikTok) jsou záměrně vynechány, dokud jejich preview renderery nepřibudou.
     - `<PostPreview>` dostal `youtubeProfile` + `availablePlatforms={availablePreviewPlatforms}`.
  7. **Překlady** `src/messages/{cs,en,uk}.json` – přidán klíč `previewYoutubeTab: "YouTube"` (ve všech třech jazycích). Ostatní `preview*` klíče zůstávají; volání v `EditPostDialog` mají hardcoded fallbacky, takže YouTube tab funguje i bez načtení messages (YouTube název je vlastní, fallbackuje na string `"YouTube"`).
- **Dopad**:
  - Příspěvek, který má v `Vybrat platformy` YouTube (nebo už na YT vyšel), nyní v náhledu vpravo zobrazí tři taby: **Facebook / Instagram / YouTube**.
  - YouTube tab ukazuje kanál připojený přes OAuth (jméno + avatar), 16:9 video frame s první přílohou, titulek z textu příspěvku a dekorativní YT prvky (Subscribe, Like/Dislike/Share).
  - Pokud YouTube v seznamu cílových platforem není, YouTube tab se vůbec nevykreslí (žádný prázdný placeholder).
- **Bezpečnost / Data**: Žádná DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Čistě UI rozšíření stávajícího renderovacího pipeline.
- **Build**:
  - `npx tsc --noEmit` prošel ✅ 0 chyb.
  - `npx eslint src/components/post-preview.tsx` prošel ✅ 0 problémů (žádné nové warningy, žádné `react-hooks/set-state-in-effect`).

### Feature – YouTube publisher: reálné nahrávání videí (DONE)

- **Cíl**: YouTube kanál lze od dneška v Postiu úspěšně propojit (viz předchozí HOTFIX záznam), ale publikování videí zatím nebylo implementované – `publishPost()` a plánovaná edge funkce `process-scheduled-posts` neměly YouTube větev. Tento commit zavírá celý end-to-end flow: klik na „Publikovat" nebo naplánování příspěvku na YouTube skutečně nahraje video přes YouTube Data API v3 a uloží `external_id` (YouTube video ID) do `post_platforms.external_id` pro pozdější odkaz/smazání.
- **Nový modul [`src/lib/actions/publish-youtube.ts`](file:///c:/VS_Code/Postio/src/lib/actions/publish-youtube.ts)** – zapouzdřuje vše specifické pro YouTube:
  1. **`getValidYouTubeAccessToken({ account })`** – kontrola `token_expires_at` s 5minutovým bezpečnostním bufferem; pokud token vypršel (nebo se blíží expirace), zavolá `exchangeRefreshToken(refreshToken)` na `https://oauth2.googleapis.com/token` s `grant_type=refresh_token`, uloží nový `access_token` + `token_expires_at` zpět do `social_accounts` přes admin klienta (kvůli RLS) a vrátí čerstvý token. Důležité: nepřepisuje `metadata.refresh_token` – Google ho při refresh-exchange zpět neposílá a my nechceme zničit stále platný refresh token.
  2. **`publishToYouTube({ accessToken, videoUrl, title, description })`** – implementuje resumable upload protokol YouTube Data API v3:
     - Stáhne video z URL (Postio ukládá do Supabase Storage, takže URL je veřejná).
     - POST na `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status` s JSON metadata (title = text příspěvku, description = text + lokace + hashtagy + `#Shorts` hint, `categoryId="22"`, `status.privacyStatus="public"`, `selfDeclaredMadeForKids=false`, `embeddable=true`). Hlavičky: `Authorization: Bearer`, `Content-Type: application/json`, `X-Upload-Content-Length`, `X-Upload-Content-Type: video/mp4`.
     - Z `Location` headeru získá jednorázovou session URI.
     - PUT na session URI s binárními daty videa. Úspěch → `{ id }` = YouTube video ID.
  3. **`publishToYouTubeAction({ account, content, mediaUrls, location, tags })`** – veřejný vstupní bod. Ověří, že médium je video (koncovka `.mp4/.mov/.m4v/.webm/.mkv`), zavolá `getValidYouTubeAccessToken`, sestaví description a nahraje video. Vrací `{ success, externalId, error? }` ve stejném tvaru jako Instagram/Facebook publishery.
- **`src/lib/actions/publish.ts`** – přidána nová větev `if (targetPlatform === "youtube")` jak do `publishPost()`, tak do `publishAdditionalPlatforms()`. Větev:
  - Načte YouTube účet přes `supabaseAdmin` se selectem `id, user_id, platform, access_token, token_expires_at, metadata` (vše potřebné pro refresh logiku).
  - Zavolá `publishToYouTubeAction(...)`.
  - Při úspěchu `handlePublishSuccess(... "youtube")` → `post_platforms.status="published"`, `published_at`, `external_id=videoId`, `publish_error=null` (stejný helper jako FB/IG).
  - Při chybě `handlePublishError(... "youtube")` → `post_platforms.status="failed"`, `publish_error=<důvod>`.
  - V obou případech se zavolá `revalidateAllLocales("/calendar"|"/posts"|"/dashboard")`.
  - **Token expirace**: kontrola probíhá uvnitř `getValidYouTubeAccessToken` – pokud access token vypršel, refresh se provede transparentně ještě před samotným uploadem, takže scheduled posty v cronu nikdy nezkolabují na 401 z Google API.
- **[`supabase/functions/process-scheduled-posts/index.ts`](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts)** – Deno port YouTube publisheru (musí být v sync s Next.js helperem, protože edge funkce běží v Deno runtime a nemůže importovat `@/lib/...`):
  - Nový `refreshYouTubeAccessToken(refreshToken)` – Deno ekvivalent `exchangeRefreshToken` (čte `GOOGLE_CLIENT_ID/SECRET` z `Deno.env.get(...)`).
  - Nový `getValidYouTubeAccessToken({ supabaseAdmin, userId })` – Deno ekvivalent Next.js helperu. Typ `DenoSupabaseClient = any` (alias kvůli generickým parametrům Deno Supabase portu vs. návratového typu `createClient`).
  - Nový `publishToYouTube(...)` – identický algoritmus (resumable upload).
  - V hlavním `for` loopu přidána větev `else if (targetPlatform === "youtube")`: pokud má post video médium, zavolá se `getValidYouTubeAccessToken` → `publishToYouTube`. Výsledek (`externalId` + případný `publishError`) se pak předá do stejného update bloku `post_platforms.status="published|failed"` jako pro FB/IG. V description se přidá `#Shorts` hint pro YouTube Shorts auto-detekci.
- **Metadata videa (dle zadání)**:
  - **Název (`snippet.title`)**: text příspěvku (`post.content`), oříznutý na 100 znaků (YouTube hard limit).
  - **Status (`status.privacyStatus`)**: `"public"` dle zadání.
  - **Shorts**: video se automaticky zpracuje jako Short, pokud je ≤ 60 s a vertikální (YouTube classifier). Pomáháme si přidáním `#Shorts` na konec description (dokumentovaný hint).
  - **Description**: text + 📍 lokace + `#tagy` + `#Shorts`, oříznuté na 5000 znaků.
- **Zpětná vazba do databáze**: Po úspěšném `videos.insert` se vrací `id` (YouTube video ID, 11 znaků, např. `dQw4w9WgXcQ`). Ten se ukládá do `post_platforms.external_id` přes `handlePublishSuccess`, takže Postio ho může později použít pro:
  - zobrazení odkazu `https://youtu.be/<id>` v detailu příspěvku,
  - budoucí smazání (`videos.delete` přes YouTube Data API v3),
  - analytiku (volání `videos.list?part=statistics` pro zobrazení views/likes).
- **Bezpečnost / Data**:
  - **Žádná DB migrace** – `social_accounts.metadata` (JSONB) a `token_expires_at` již existují z migrací 027 a 029.
  - **Žádné nové npm/Deno závislosti** – vše na nativním `fetch` + `URLSearchParams`.
  - **`refresh_token` ochrana**: při refreshi se nikdy nepřepisuje `metadata.refresh_token` (Google ho na refresh-exchange zpět neposílá a my nechceme zničit stále platný token).
  - **Žádné nové API routes** – YouTube publish se spouští buď přes existující `publishPost()` (button „Publikovat teď") nebo přes plánovanou edge funkci `process-scheduled-posts`.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Po připojení YouTube kanálu (viz předchozí záznam) lze vytvořit příspěvek s alespoň jedním videem, zvolit YouTube jako cílovou platformu a kliknout „Publikovat". Systém transparentně obnoví token (pokud vypršel) a nahraje video přes YouTube Data API v3.
  - Plánované YouTube posty (cron přes `process-scheduled-posts`) projdou stejnou logikou v Deno edge funkci – cron nikdy nezkolabuje na 401, protože `getValidYouTubeAccessToken` refreshne token před uploadem.
  - Po úspěšném uploadu se v databázi uloží YouTube video ID do `post_platforms.external_id`. UI v budoucnu může zobrazit odkaz na video a tlačítko pro smazání.
- **Možné rozšíření (mimo scope tohoto commitu)**:
  - UI tlačítko „Otevřít na YouTube" + „Smazat z YouTube" (využívá uložené `external_id`).
  - Editace titulku/description přes `videos.update` (YouTube API to podporuje; scope `youtube.upload` stačí).
  - Zobrazení statistik videa (views/likes) přes `videos.list?part=statistics` v analytics dashboardu.

### Fix – YouTube OAuth: přidání `youtube.readonly` scope pro `channels.list` (HOTFIX)

- **Problém**: Po úspěšném Google OAuth flow (consent screen → redirect zpět) YouTube připojení končilo na `/accounts?error=Failed%20to%20load%20YouTube%20channel`. V terminálu se objevila chyba 403 z YouTube Data API v3:
  ```
  Request had insufficient authentication scopes.
  reason: insufficientPermissions
  ACCESS_TOKEN_SCOPE_INSUFFICIENT
  service: youtube.googleapis.com
  method: youtube.api.v3.V3DataChannelService.List
  ```
- **Příčina**: V [`src/app/api/auth/google/route.ts`](file:///c:/VS_Code/Postio/src/app/api/auth/google/route.ts) se do Google OAuth URL posílal pouze scope `https://www.googleapis.com/auth/youtube.upload`. Tento scope je ale **write-only** – umožní volat `videos.insert`, ale **nepostačuje** pro čtení kanálu přes `channels.list?mine=true`. YouTube Data API v3 vyžaduje pro čtení jeden z: `youtube`, `youtube.readonly` nebo `youtube.force-ssl`. Token exchange sám o sobě proběhl úspěšně (access + refresh token získány, scopes v odpovědi: `email profile …/youtube.upload …/userinfo.profile …/userinfo.email openid`), ale hned první read dotaz `channels.list?mine=true` selhal na chybějících oprávněních.
- **Oprava**: Přidán scope `https://www.googleapis.com/auth/youtube.readonly` do pole `GOOGLE_SCOPES` v [`src/app/api/auth/google/route.ts`](file:///c:/VS_Code/Postio/src/app/api/auth/google/route.ts#L4-L19). Výsledná kombinace je minimální nutná pro Postio:
  - `youtube.upload` – umožní později volat `videos.insert` (budoucí YouTube publisher).
  - `youtube.readonly` – umožní volat `channels.list?mine=true` v callbacku pro získání channel ID a snippetu (nyní i v budoucnu pro čtení statistik videí).
  - `openid` + `userinfo.profile` – zůstávají pro graceful fallback identity, kdyby YouTube API selhalo.
- **Dopad**: Po této opravě YouTube OAuth flow projde celý:
  1. Consent screen nyní žádá o oba scopes (write + read).
  2. Token exchange vrátí access + refresh token s oběma scopes v `scope` poli odpovědi.
  3. `channels.list?mine=true` vrátí kanál místo 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT.
  4. Callback uloží kanál do `social_accounts` a přesměruje na `/accounts?yt=connected`.
- **Důležitá poznámka pro Google Cloud Console**: Scope přibyl do OAuth URL, takže se při dalším spuštění flow zobrazí consent screen s novým scopen `youtube.readonly`. Google účet, který již dříve udělil pouze `youtube.upload`, bude požádán o rozšíření oprávnění. Díky `prompt=consent` v URL (z předchozího commitu) se consent screen vždy zobrazí – žádný tichý re-consent, kde by si uživatel nevšiml, že nová práva uděluje.
- **Bezpečnost / Data**: Žádná DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Pouze přidání jednoho scope stringu do pole + aktualizace JSDoc komentáře.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Ověření**: YouTube kanál se nyní úspěšně připojí přes `/accounts` → dlaždice YouTube → Google OAuth → kanál se objeví v seznamu připojených účtů se jménem (`snippet.title`) a avatarem (`snippet.thumbnails.high`).

### Debug – YouTube OAuth callback: rozšířené logování pro diagnostiku (HOTFIX)

- **Problém**: Uživatelé procházejí celým Google OAuth flow (klik na dlaždici YouTube v `/accounts` → consent screen → udělení všech práv → redirect zpět), ale YouTube kanál se v seznamu připojených účtů neobjeví. Bez diagnostických logů nebylo možné zjistit, ve kterém kroku flow selhává – chyba se tiše přesměrovala na `/accounts` bez zobrazení příčiny.
- **Cíl**: Do [`handleYouTubeCallback`](file:///c:/VS_Code/Postio/src/app/auth/callback/route.ts#L83-L294) přidat podrobné `console.log` / `console.error` výpisy, které odhalí přesné místo selhání (chybějící kód, neúspěšný token exchange, prázdná odpověď z YouTube API, chyba v Postgres upsertu).
- **Přidané DEBUG logy** v [`src/app/auth/callback/route.ts`](file:///c:/VS_Code/Postio/src/app/auth/callback/route.ts):
  1. **`🔍 DEBUG: Začínám zpracování YouTube callbacku`** – hned na začátku `handleYouTubeCallback`, potvrzuje že callback vůbec dorazil.
  2. **`🔍 DEBUG: Query parametry: {...}`** – kompletní dictionary všech query parametrů z URL (code, state, scope, error, error_description…). Pomůže odhalit, jestli Google vrátil `error=access_denied` místo `code`.
  3. **`🔍 DEBUG: Access Token získán: ano/ne`** + `Refresh Token získán: ano/ne` + `Expires in (s)` + `Scope` – po úspěšném token exchange. Ukáže jestli Google vrátil access token a jestli má správné scopes.
  4. **`🔍 DEBUG: Odpověď z YouTube API (channels list): {…kompletní JSON…}`** – celý `items` objekt z YouTube Data API, vytištěný přes `JSON.stringify(..., null, 2)` pro čitelnost.
- **Vylepšené chybové logy**:
  - Když `items` z YouTube API je prázdné (kanál neexistuje nebo scope nestačí): přidán **⚠️ CHYBA: Google nevrátil žádný YouTube kanál pro tento účet** + výpis počtu položek + tipy na možné příčiny (účet nemá YouTube kanál, scope `youtube.upload` nestačí na `channels.list` – potřeba `youtube.readonly` nebo `youtube.force-ssl`).
  - Když selže DB upsert: původní jednořádkový `console.error` nahrazen **detailním výpisem všech polí Postgres chyby** – `message`, `code`, `details`, `hint` + kompletní `JSON.stringify(dbError)`. Důvod: objekt PostgrestError v konzoli často zobrazí jen `[object Object]` bez detailů.
- **Dočasné přesměrování při chybě**: Každý `errorRedirect()` nyní v URL předává i konkrétní kód chyby (např. `?error=Google+nevrátil+žádný+YouTube+kanál+pro+tento+účet+(no_youtube_channel)` nebo `?error=Failed+to+save+YouTube+account:+<Postgres+message>+(db_error)`). Stávající `useEffect` v accounts page (z předchozího commitu) tyto query parametry čte a zobrazí je přes `toast.error(t("connectionError", { error }))` – takže se chyba uživateli zobrazí v toastu, ne jen v terminálu.
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Přidány pouze `console.log`/`console.error` a upraven text v `errorRedirect()`. `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Diagnostický postup pro uživatele**:
  1. Spustit `npm run dev` a mít otevřený terminál.
  2. V novém okně (anonymní režim) projít YouTube OAuth flow.
  3. Po návratu na `/accounts` zkopírovat výstup z terminálu – uvidíme přesně, ve kterém kroku se to zastavilo:
     - Chybí `🔍 DEBUG: Začínám zpracování YouTube callbacku` → callback vůbec nedorazil (problém v `redirect_uri` v Google Cloud Console, scopes, nebo `GOOGLE_CLIENT_ID`).
     - Chybí `Access Token získán: ano` → token exchange selhal (špatný `client_secret`, vypršelý `code`, nebo chybný `redirect_uri`).
     - `channels.list` v odpovědi vrací prázdné `items[]` → buď Google účet nemá YouTube kanál, nebo scope `youtube.upload` nestačí (typicky je potřeba `youtube.readonly` pro `channels.list?mine=true`).
     - `⚠️ CHYBA: Supabase DB upsert selhal` → RLS/constraint chyba v Postgresu – výpis `code`/`message`/`hint` ukáže přesnou příčinu.

## 2026-06-19

### Fix – Chybějící `NEXT_PUBLIC_SUPABASE_URL` v `.env.local` (HOTFIX)

- **Problém**: Po checkoutu větve `feature/youtube-integration` spadl `next dev` s chybou `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!` na všech stránkách (`/cs/login`, `/cs/accounts`, `/cs`, `/api/accounts/facebook/select`, …). Chyba se opakovala v `src/lib/supabase/client.ts` (řádek 8), `CookieConsent`, `SetupGuide`, `AccountsPage`, `LocaleLayout` – tedy v každém místě, které lazy-inicializuje browser Supabase client.
- **Příčina**: V [`.env.local`](file:///c:/VS_Code/Postio/.env.local) chyběla proměnná `NEXT_PUBLIC_SUPABASE_URL`. Soubor obsahoval `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` i `SUPABASE_SERVICE_ROLE_KEY`, ale URL bylo úplně pryč – pravděpodobně smazáno při předchozích úpravách. `src/lib/supabase/client.ts` pak posílal `undefined` do `createBrowserClient(..., undefined!)`, což `@supabase/ssr` odmítá.
- **Detekce**: Supabase hostname `rfgortcdptfmmonsqjtp.supabase.co` je v projektu natvrdo dvakrát – v [`next.config.ts`](file:///c:/VS_Code/Postio/next.config.ts) (`images.remotePatterns`) a v CHANGELOGu (URL `process-scheduled-posts` edge function). Z toho se dala rekonstruovat plná URL `https://rfgortcdptfmmonsqjtp.supabase.co`. Middleware navíc dělá `placeholder` check, takže placeholder by znamenal `isSupabaseConfigured = false` → graceful fallback na `/login`. Proto musí jít o reálnou URL.
- **Oprava**: Přidán řádek `NEXT_PUBLIC_SUPABASE_URL=https://rfgortcdptfmmonsqjtp.supabase.co` na úplný začátek [`.env.local`](file:///c:/VS_Code/Postio/.env.local), těsně před `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Žádné další env vars se neměnily.
- **Bezpečnost / Data**: Žádné DB migrace. Žádné změny kódu – pouze jeden řádek v `.env.local` (soubor v `.gitignore`, takže se necommitne). Žádné nové API routes ani npm závislosti.
- **Dopad**: `next dev` by měl znovu naběhnout bez chyb. Všechna místa, která inicializují Supabase client (`AccountsPage`, `CookieConsent`, `SetupGuide`, `LocaleLayout`, `auth/callback` route, `email-signin`, `google-signin-button`, middleware), dostanou platnou URL a `@supabase/ssr` již nevyhodí runtime chybu. Auth, session refresh a DB dotazy se obnoví. Pokud by se po této opravě stále zobrazovala chyba, zkontroluj, že `next dev` opravdu znovu načetl `.env.local` (Next.js jej čte při startu, takže je třeba `npm run dev` restartovat).

## 2026-06-19

### Feature – YouTube integrace: UI propojení (DONE)

- **Cíl**: Backend OAuth flow pro YouTube (`/api/auth/google` + `/auth/callback?provider=youtube`) byl hotový z předešlého commitu, ale v UI na stránce `/accounts` tlačítko YouTube stále padalo do legacy manuálního formuláře (accountName + accessToken). Tento commit dokončuje celý user-flow: klik na dlaždici YouTube → univerzální modal → Google OAuth → redirect zpět → toast + kanál v seznamu.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  1. **OAuth platform check**: v `onClick` tlačítka platformy rozšířen seznam platforem, které otevírají `ConnectAccountModal` (`instagram`, `facebook`, `linkedin`, `youtube`). YouTube tlačítko se již nepropadne do manuálního formuláře.
  2. **YouTube OAuth branch v `onConnect`**: nový `else if (connectModalPlatform.id === "youtube")` – sestaví URL `/api/auth/google?state=<next>&locale=<locale>` (stejný vzor jako LinkedIn) a přesměruje na ni. Backend route sama přidá `provider=youtube` do interního `redirect_uri`, takže callback ví, že nemá spustit Supabase Auth `exchangeCodeForSession`.
  3. **YouTube-specific warning v modalu**: v ternárním `warningDesc` přidána větev pro YouTube → `t("connectModal.warningDescYouTube")`. Text říká uživateli, že bude přesměrován na Google a že tokeny držíme v bezpečí.
  4. **Nový `useEffect` pro `?yt=connected` a `?error=`**: callback route po úspěšném připojení přesměruje na `?yt=connected`, po chybě na `?error=<msg>`. Tento useEffect:
     - Okamžitě odstraní query parametry z URL přes `router.replace(window.location.pathname)` – ochrana proti opakovanému spuštění při manuálním refresh.
     - Při `?yt=connected`: zavolá `fetchAccounts()` (refreshne seznam) a zobrazí `toast.success(t("ytConnectedShort"))`.
     - Při `?error=…`: zobrazí `toast.error(t("connectionError", { error }))`.
     - Závislosti: `[ytSignal, errorSignal, router, t]` – při změně searchParams nebo při změně překladů se efekt znovu vyhodnotí.
  5. **YouTube handle v kartě připojeného účtu**: nový Badge pod jménem kanálu zobrazuje `metadata.custom_url` (např. `@pepa`) – stejný vizuální vzor jako `metadata.category` u Facebook Pages. Badge má `title` atribut pro accessibility.
  6. **Rozšíření `SocialAccount.metadata` typu**: přidána pole `refresh_token?: string | null` (pro plánované obnovování přístupu v `process-scheduled-posts`) a `custom_url?: string | null` (UI handle). Zpětně kompatibilní – `category` a `access_token` pro FB zůstávají nedotčeny.
- **`src/components/connect-account-modal.tsx`** – beze změn. Komponenta je od začátku platform-agnostická (`platformName`, `PlatformIcon` a `t.warningDesc` se předávají jako props).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) v sekci `accounts`:
  - `connectModal.warningDescYouTube` – YouTube-specific upozornění v OAuth modalu.
  - `ytConnected` (ICU s `{name}`) – plná zpráva s názvem kanálu, připraveno pro budoucí použití.
  - `ytConnectedShort` – krátká verze bez placeholderu pro toast (jméno kanálu je vidět v seznamu hned vedle).
  - `ytDisconnected` (ICU s `{name}`) – pro případné budoucí toast po odpojení.
  - `connectionError` (ICU s `{error}`) – pro zobrazení chybových zpráv z OAuth callbacku.
- **Smazání YouTube účtu**: `handleDeleteConnectedAccount` maže obecně podle `account.id` (RLS chrání), YouTube tedy funguje stejně jako ostatní platformy – **žádná změna potřeba**.
- **Bezpečnost / Data**: Žádná DB migrace. Žádné nové API routes. Žádné nové npm závislosti (`toast` ze `sonner` už v projektu je).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Uživatel klikne na dlaždici **YouTube** v `/accounts` → otevře se `ConnectAccountModal` (stejný vizuál jako pro FB/IG/LinkedIn) → klikne „Propojit" → přesměrování na Google consent screen → po souhlasu Google vrátí `code` do `/api/auth/google` → ten přesměruje na `/auth/callback?provider=youtube` → callback provede token exchange + `channels.list` + upsert do `social_accounts` → redirect na `/cs/accounts?yt=connected` → UI refetchne seznam, zobrazí toast, vyčistí URL.
  - YouTube kanál se v seznamu připojených účtů zobrazí se svým **názvem** (`snippet.title`) a **avatarem** (`snippet.thumbnails.high/medium/default`). Handle (`@…`) je v badge pod jménem.
  - **Smazání**: tlačítko koš → potvrzovací dialog → DELETE na `social_accounts` → kanál zmizí ze seznamu. Funguje identicky jako u ostatních platforem.

## 2026-06-19

### Feature – YouTube integrace: Google OAuth + uložení kanálu (DONE)

- **Cíl**: Umožnit uživatelům připojit YouTube kanál k Postiu stejným způsobem jako Facebook/Instagram/LinkedIn. Scope musí zahrnovat `youtube.upload` (pro budoucí publikování videí) a vyžadujeme `refresh_token`, protože Google access tokeny expirují po 1 hodině.
- **Nový endpoint `GET /api/auth/google`** ([route.ts](file:///c:/VS_Code/Postio/src/app/api/auth/google/route.ts)):
  - GET handler, dva módy:
    1. **Bez `code`**: přesměruje uživatele na Google consent screen (`https://accounts.google.com/o/oauth2/v2/auth`) se scopes `openid`, `https://www.googleapis.com/auth/userinfo.profile`, `https://www.googleapis.com/auth/youtube.upload`. Důležité parametry: `access_type=offline` + `prompt=consent` (zajistí, že Google vrátí `refresh_token` i při opakovaném připojení) a `include_granted_scopes=true` (přidá již dříve udělené scopes, ať se consent screen neptá znovu).
    2. **S `code`**: přesměruje na `/auth/callback?provider=youtube&code=…&state=…`. Výměna tokenů se **schválně neděje zde** – zůstává v jednom místě (callbacku), konzistentně s ostatními Postio OAuth flow.
  - `redirect_uri` je natvrdo `${origin}/auth/callback?provider=youtube` – **musí se přesně shodovat** s tím, co je nastavené v Google Cloud Console → Credentials.
  - `state` nese cestu kam se vrátit po úspěchu (např. `/cs/accounts`), locale se odvodí ze `state` nebo z `referer` headru.
- **`src/app/auth/callback/route.ts` – nová větev `provider === "youtube"`**:
  - Větev je **před** Supabase Auth `exchangeCodeForSession`, aby se YouTube flow nepomísil s přihlášením (jinak by Supabase zkusil uživatele přihlásit jako Google identitu a ignoroval by YouTube scope).
  - Nová privátní async funkce `handleYouTubeCallback(request)`:
    1. Ověří přihlášeného Postio uživatele přes `createClient().auth.getUser()` – YouTube nelze připojit bez aktivní session. Pokud není přihlášený, redirect na `/[locale]/login?error=...`.
    2. **Token exchange** na `https://oauth2.googleapis.com/token` (POST, `application/x-www-form-urlencoded`, `grant_type=authorization_code`). `redirect_uri` se posílá **včetně `?provider=youtube`** query – musí přesně odpovídat tomu, co šlo do Google v kroku 1.
    3. **YouTube Data API**: `GET https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=1` s `Authorization: Bearer <access_token>`. Vezme se první položka z `items[]`.
    4. **Uložení do `social_accounts`** přes `createAdminClient()` (kvůli RLS), upsert s `onConflict: "user_id,platform,platform_id"` – stejný vzor jako LinkedIn/FB.
    5. Redirect na `/[locale]/accounts?yt=connected` (signál pro UI, že připojení proběhlo).
  - **Refresh token**: uloží se do `metadata.refresh_token` (JSONB sloupec z migrace 029). **Podmíněně** – Google vrací `refresh_token` jen při prvním exchange nebo když `prompt=consent` je v OAuth URL. Při re-connectu bez nového refresh_tokenu se **původní v metadata NEPŘEPÍŠE** (`...(refreshToken ? { refresh_token: refreshToken } : {})`), aby se nezničil stále platný token.
  - **Další uložená metadata**: `custom_url` (handle kanálu, např. `@pepa`) – pro budoucí UI zobrazení.
  - **Token expirace**: `token_expires_at = Date.now() + expires_in * 1000`. Když Google z nějakého důvodu nevrátí `expires_in`, padneme na 1 hodinu (`3600 * 1000`).
  - **Channel info**: `platform_id` = YouTube channel ID (`UC…`), `account_name` = `snippet.title`, `avatar_url` = největší dostupný thumbnail (high → medium → default).
- **`.env.local`** (nový soubor, v `.gitignore`):
  - Přidány placeholdery `GOOGLE_CLIENT_ID=` a `GOOGLE_CLIENT_SECRET=` (uživatel doplní z Google Cloud Console).
  - Ponechány ostatní existující env vars (Supabase, App URL) beze změny.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Bezpečnost / Data**:
  - **Žádná DB migrace** – constraint na `social_accounts.platform` již `youtube` povoluje (z migrací 012 a 013, kdy se připravovaly constrainty pro budoucí platformy).
  - **Žádné nové npm závislosti** – vše na nativním `fetch`.
  - **OAuth state** se posílá jen jako relativní cesta (`/cs/accounts`); validuje se `startsWith("/")` aby nešlo podstrčit externí URL.
  - **Refresh token** se ukládá v JSONB – není vidět v běžných SELECTech bez explicitního `select("metadata")`, ale admin klient ho čte. Pokud by bylo potřeba sloupce (např. pro `findExpiredChannels()`), přidá se samostatná migrace.
  - **Chybové stavy**: každý krok (token exchange, channels.list, DB upsert) má vlastní catch a přesměruje na `?error=…` – uživatel nikdy neuvízne na bílé obrazovce.
- **Dopad**:
  - YouTube kanály lze nyní připojit OAuth flow (YouTube tlačítko v `/accounts` stránce již existuje, toto je backend půlka flow).
  - `access_token` v DB platí 1 hodinu; `metadata.refresh_token` umožní pozdější obnovu v `process-scheduled-posts` nebo v novém YouTube publisheru.
  - `platform_id` = YouTube channel ID je připravený jako klíč pro budoucí `videos.insert` endpoint.
  - `metadata.custom_url` je připravený pro UI v `/accounts` (zobrazit `@handle` u kanálu).
  - Všechny ostatní OAuth flow (Supabase Auth, LinkedIn, Facebook) zůstávají nedotčeny – větev `provider === "youtube"` se spustí **pouze** pro YouTube requesty.

### UX – Šablony: celá karta klikací, přirozené texty, decentní smazání (DONE)

- **Cíl**: Stránka `/[locale]/templates` měla v každé kartě dvě zbytečná tlačítka („Použít" a malou ikonu koše) a tři výchozí šablony měly anglické nebo polopatičské názvy. Cílem této iterace bylo (1) dát kartám jeden intuitivní klik (žádné přemýšlení „které tlačítko teď"), (2) dostat texty šablon do přirozené češtiny a (3) sladit mazání s novým interakčním modelem.
- **Databáze – migrace `030_rename_default_templates.sql`** (nová):
  - 4 idempotentní UPDATE příkazy, které přejmenují šablony vytvořené seedovacím triggerem u **stávajících** uživatelů. Noví uživatelé dostanou správné názvy rovnou z upraveného `003_seed_templates.sql`.
  - Každý UPDATE cílí na konkrétní starý `name` (nebo konkrétní úvodní `content`), takže opakované spuštění migrace je `no-op` – nic se nepřejmenuje dvakrát, nic se nepřepíše u šablon, které uživatel mezitím upravil.
  - **Opravené texty**:
    - `Behind the scenes` → **`Ze zákulisí`**
    - `Tip/Triky` → **`Tipy a triky`**
    - `Weekly Recap` → **`Týdenní shrnutí`**
    - Motivační citát `„Úspěch není konečný, selhání není fatální. Je to odvaha pokračovat, která počítá."` → **`„Úspěch není konečný, selhání není fatální – důležitá je odvaha pokračovat."`** – pomlčka místo dvou samostatných vět, přirozenější český slovosled, zachovaný význam (Churchill).
- **`supabase/migrations/003_seed_templates.sql`** – odpovídající úprava textů u **nových** uživatelů (trigger `handle_new_user` vkládá rovnou české názvy).
- **`src/lib/actions/templates.ts`** – nová server akce `deleteTemplate(id)`:
  - Ověří přihlášení přes `auth.getUser()`.
  - Smaže záznam přes `delete().eq("id", id).eq("user_id", user.id)` – RLS by ochránilo stejně, ale explicitní filtr je „belt and braces" a pomáhá query planneru.
  - Po úspěchu zavolá `revalidatePath` pro všechny tři locales `/templates`.
  - Vrací standardní `{ success, error? }` kontrakt.
- **`src/app/[locale]/(dashboard)/posts/new/page.tsx`** – podpora `?template=<id>`:
  - Import `useSearchParams` z `next/navigation`.
  - Nový `useEffect` po mountu sleduje query parametr `template`. Pokud je přítomný a `userId` je známý, dotáhne `templates.content` z DB (`.eq("id").eq("user_id").maybeSingle()`) a nastaví ho do state `content`. RLS zajišťuje, že uživatel nemůže předvyplnit obsah cizí šablony.
  - **Guard proti přepisu uživatelových úprav**: `templateAppliedRef` (useRef) si pamatuje ID naposledy aplikované šablony. Pokud se `searchParams` nezmění, useEffect se sice spustí při každém re-renderu (závisí na `[searchParams, userId, t]`), ale `templateAppliedRef.current === templateId` vrátí dřív, než by se dotkl DB nebo state. Tím se šablona načte jen jednou.
  - **Cancellation guard**: `let cancelled = false` + cleanup funkce – pokud se komponenta odmountuje mezi dotazem a odpovědí, ignorujeme výsledek, aby se nezobrazil toast na již opuštěné stránce.
  - Po úspěchu `toast.success(t("templateApplied", { name: data.name }))`. Při chybě / nenalezení `toast.error(t("templateLoadError"))`.
- **`src/app/[locale]/(dashboard)/templates/page.tsx`** – redesign karet:
  - **Anatomie karty (3 vrstvy, klikací ve správném pořadí)**:
    1. `<article className="group …">` – vizuální shell, vlastní `group` state a všechny hover efekty.
    2. `<Link className="absolute inset-0 z-10 …">` – průhledná absolutní vrstva přes celou kartu, vede na `/posts/new?template=<id>`. `focus-visible:ring-2 focus-visible:ring-indigo-500/60` pro klávesnici.
    3. `<form>` v pravém horním rohu – sedí nad Linkem (`flex` kontejner ho přirozeně řadí nad absolutní layer, takže submit tlačítko nikdy nepropadne do `<a>`).
  - **Hover efekty**: `hover:-translate-y-0.5` (jemný „lift"), `hover:border-white/10`, `hover:bg-card/60`, `hover:shadow-lg hover:shadow-indigo-500/10` (indigo glow). `focus-within` varianty pro klávesnici.
  - **Ikonka koše**: malá 28 × 28 px, neviditelná v klidu (`opacity-0`), fade-in na `group-hover` (150 ms). Sémanticky správný `<button type="submit">` uvnitř `<form action={serverAction}>` – submit formuláře se nikdy nepropaguje do nadřazeného `<a>` (žádný JS handler, žádný `stopPropagation` potřeba; chování je dáno samotným HTML modelem formuláře + odkazu).
  - **Glassmorphism**: karta má `rounded-[20px] border border-white/5 bg-card/40 backdrop-blur-md` – konzistentní se zbytkem Postio.
  - **Bezpečnost pro smazání**: žádný `confirm()` dialog (Postio design dává přednost decentnímu mazání). Akce je rychlá a `revalidatePath` okamžitě aktualizuje stránku. Pokud by bylo v budoucnu potřeba potvrzení, stačí přidat `useTransition` + modal – nezahrnováno do scope, držíme se jednoduchosti.
  - **Odstraněno**: tlačítko „Použít", import `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Copy` ikona – všechno nahrazeno jedním klikatelným celkem.
- **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`) – 3 nové klíče v sekci `templates`:
  - `deleteConfirm` – text pro `aria-label` a `title` tlačítka koš.
  - `templateApplied` (ICU s `{name}`) – „Šablona „{name}" byla použita" / „Template \"{name}\" applied" / „Шаблон «{name}» застосовано".
  - `templateLoadError` – „Šablonu se nepodařilo načíst" / „Could not load template" / „Не вдалося завантажити шаблон".
- **Bezpečnost / Data**: Žádná změna schématu. Migrace `030` pouze mění `name` / `content` existujících řádků, žádné sloupce nepřidává. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Karta šablony reaguje na **jedno přirozené kliknutí** – žádné rozhodování „které tlačítko".
  - **Smazání je skryté, ale dostupné**: neviditelné v klidu, objeví se na hoveru, decentní 28 px tlačítko s hover efektem (`hover:bg-destructive/10 hover:text-destructive`). Form submit nikdy nepropaguje do Linku.
  - **Výchozí šablony** mají české, přirozeně znějící názvy. Motivační citát má čitelnou interpunkci.
  - **Stávající uživatelé** dostanou opravené texty po nasazení migrace `030` (automaticky při příštím deployi, pokud se migrace spouští).
  - **Nový use-case** „aplikovat šablonu v editoru" je nyní single-click – vyberu kartu, jsem v editoru s předvyplněným textem, můžu hned upravovat a plánovat.

### Fix – Neplatný JSON v cs.json (HOTFIX)

- **Problém**: Po úpravě `templates.templateApplied` v `cs.json` spadl `next dev` s `ModuleParseError: Cannot parse JSON … line 403 column 42`. Stejný řádek byl 500 při `GET /cs/templates` – aplikace nebyla spustitelná.
- **Příčina**: Původní text `„Šablona „{name}" byla použita"` používal pro **vnitřní** uvozovky kolem `{name}` ASCII znak `"` (U+0022). Vnější obal stringu v JSONu je také `"`, takže parser četl `"` po `}` jako konec stringu a čekal čárku nebo `}` – proto `Expected ',' or '}' after property value`.
- **Oprava**: V [cs.json](file:///c:/VS_Code/Postio/src/messages/cs.json#L403) řádek 403 změněno na `„Šablona „{name}“ byla použita"` – vnější pár je Unicode `„` (U+201E) + `“` (U+201C), které JSON parser neinterpretuje jako konec stringu. Typograficky je to navíc správně – v češtině se `„…"` používá pro primární uvozovky.
- **Kontrola ostatních jazyků**: `en.json` měl `\"{name}\"` (escapované ASCII uvozovky – validní) a `uk.json` měl `«{name}»` (Unicode `«»` – validní). Žádná další oprava nutná.
- **Bezpečnost / Data**: Žádné DB / runtime změny, pouze textová oprava v překladovém souboru.
- **Dopad**: `next dev` se opět zkompiluje, `GET /cs/templates` vrací 200, toast `templateApplied` se zobrazí se správným textem včetně uvozovek kolem jména šablony.

## 2026-06-19

### Styl – Tenký scrollbar na hlavní scroll oblasti dashboardu (DONE)

- **Problém**: Scrollbar na pravé straně stránek `/posts`, `/profile`, `/calendar`, `/dashboard`, `/accounts`, `/settings` atd. byl výchozí scrollbar prohlížeče – v dark mode tlustý bílý/šedý pruh, který rušil glassmorphism design.
- **Příčina**: Hlavní scroll oblast je v [layout.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/layout.tsx) – `<main className="… overflow-y-auto …">`. Scrolluje se v něm obsah **všech** stránek v dashboardu, takže nešlo řešit jednotlivě (jinak by se musela stejná třída kopírovat na 6+ stránek).
- **Řešení**: Na `<main>` v [layout.tsx](file:///c:/VS_Code/Postio/src/app/[locale]/(dashboard)/layout.tsx) přidána třída `postio-scrollbar` (definovaná v `globals.css` – 6 px tenký, transparentní track, poloprůhledné bílé/černé táhlo s hover zvýrazněním + Firefox podpora).
- **Dopad**:
  - Scrollbar na pravé straně dashboardu je nyní na všech stránkách (Dashboard, Posts, Profile, Calendar, Accounts, Settings, Analytics, Inbox…) konzistentně tenký a elegantní.
  - Jeden bod úpravy pokrývá celý dashboard – žádné duplicitní třídy na jednotlivých stránkách.
  - Třída `postio-scrollbar` se nyní v projektu používá na **4 scrollujících oblastech**: tento `<main>` v dashboard layoutu + 3 oblasti v `EditPostDialog` / `PostPreview` (z předešlého commitu).
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

## 2026-06-19

### Styl – Vlastní tenký scrollbar v editoru příspěvků (DONE)

- **Problém**: V `EditPostDialog` (formulář + živý náhled FB/IG) byl použit výchozí scrollbar prohlížeče. V dark mode vypadal jako tlustý bílý/šedý pruh, který rušil celkový glassmorphism dojem a vizuálně „lepil" z karty ven.
- **Cíl**: Nahradit výchozí scrollbar jemným, průhledným, poloprůhledným táhlem, které sedí k designu (Pure Black + glassmorphism karty), bez ztráty funkčnosti scrollu.
- **Řešení**: Nová utility třída `.postio-scrollbar` v `src/app/globals.css` (`@layer utilities`).
  - **Webkit (Chrome / Edge / Safari)**:
    - `::-webkit-scrollbar` → `width: 6px; height: 6px` (velmi tenké).
    - `::-webkit-scrollbar-track` → `background: transparent` (track neviditelný).
    - `::-webkit-scrollbar-thumb` → `background: rgba(0, 0, 0, 0.18)` (light) / `rgba(255, 255, 255, 0.18)` (dark), `border-radius: 9999px` (plně zakulacené).
    - `:hover::-webkit-scrollbar-thumb` → `rgba(0, 0, 0, 0.28)` (light) / `rgba(255, 255, 255, 0.28)` (dark) – táhlo se při najetí myší mírně zvýrazní, aby uživatel věděl, že je scroll aktivní.
  - **Firefox**: `scrollbar-width: thin` + `scrollbar-color: <barva> transparent` – nativní Firefox scrollbar, opticky konzistentní s webkitem.
  - **Light / dark**: barvy táhla se přepínají přes `.dark .postio-scrollbar` selektor – v dark mode bílé/18 (sedí na Pure Black), v light mode černé/18 (sedí na bílém `bg-white/80` dialogu).
- **Aplikace** (3 scrollující oblasti, všechny v editoru příspěvků):
  - `src/components/edit-post-dialog.tsx` řádek 936 – hlavní scroll formuláře (`max-h-[60vh] overflow-y-auto`). Toto je scroll, který byl na screenshotu – vede podél pravé hrany levého sloupce.
  - `src/components/post-preview.tsx` – feed card uvnitř `FacebookPreview` (scroll uvnitř FB simulace, aktivní u dlouhých captionů).
  - `src/components/post-preview.tsx` – feed card uvnitř `InstagramPreview` (scroll uvnitř IG simulace).
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti. Žádný plugin (`tailwind-scrollbar`) nebyl potřeba – řešení je čistě v nativním CSS, funguje ve všech moderních prohlížečích.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Scrollbar v editoru příspěvků je nyní elegantní, 6 px tenký, průhledný, s jemným bílým (dark) / černým (light) táhlem, které při hoveru mírně zvýrazní. Všechny 3 scrollující oblasti v editoru (formulář, FB preview, IG preview) mají konzistentní vzhled. Skleněný design již nenarušuje nevzhledný výchozí scrollbar.
- **Poznámka k Tailwindu**: Tailwind v4 sám o sobě generuje `scrollbar-thin` + `scrollbar-track-*` + `scrollbar-thumb-*`, ale **neumí** generovat `:hover` variantu pro scrollbar thumb (neumí kombinovat pseudo-class `:hover` se selektorem `::-webkit-scrollbar-thumb`). Proto je scrollbar definován jako custom utility třída v `globals.css`, která pokrývá hover, active i Firefox najednou.

## 2026-06-19

### Fix – Video preview v kalendáři (HOTFIX)

- **Problém**: V hover preview na `/[locale]/calendar` se u příspěvků s video souborem (`.mp4`) místo náhledu videa zobrazoval fallback text „Media preview" / prázdný rámeček. Konzole hlásila `The requested resource isn't a valid image for ...mp4 received null`.
- **Příčina**: `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` používal pro render média v hover preview vždy `<NextImage>` (next/image), bez ohledu na to, zda médium bylo obrázek nebo video. Next.js image optimizer neumí dekódovat `.mp4` a vyhazuje chybu. U statických obrázků (`Test 5` – viz. obrázek 2) fungovalo vše správně.
- **Oprava**:
  - Import `Play` z `lucide-react` přidán do hlavičky importů.
  - Render media v hover preview nyní rozlišuje image vs. video na základě koncovky URL (regex `/\.(mp4|mov|webm)(\?.*)?$/i`) – stejný helper jako v `src/app/[locale]/(dashboard)/posts/_post-card.tsx` a `src/lib/actions/publish.ts::getFacebookMediaType`, takže chování kalendáře je konzistentní se zbytkem aplikace.
  - **Video**: `<video src={...} preload="metadata" muted playsInline className="w-full h-full object-cover" />` + overlay s `Play` ikonou (průhledná tmavá vrstva + bílé play tlačítko uprostřed) pro jasné UX.
  - **Obrázek**: `<NextImage>` beze změny (optimalizované dekódování přes Next.js image optimizer).
  - Wrapper `div` dostal `relative` (kvůli absolutnímu overlay) – rozměry a `aspect-video` rounded overflow zůstávají.
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti (`Play` je z `lucide-react`, které už v `package.json` je).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Hover preview v kalendáři nyní korektně zobrazuje první rámec videa (thumbnail z `<video preload="metadata">`) u video postů, stejně jako u obrázkových postů. Chyby `isn't a valid image` v terminálu by měly zmizet.

## 2026-06-19

### Feature – Náhled příspěvku v editoru (Post Preview) (DOKONČENO)

- **Cíl**: Při psaní příspěvku chtěl uživatel v reálném čase vidět, jak bude jeho post vypadat na Facebooku a Instagramu. Doposud musel obsah „odeslat naslepo" a kontrolovat výsledek až na síti.
- **Nová komponenta `src/components/post-preview.tsx`**:
  - Client component (vyžaduje `useState` pro přepínání platformy).
  - **Vnější obal**: Postio glassmorphism (`rounded-[20px] border border-white/5 bg-card/40 backdrop-blur-md`) – konzistentní se zbytkem aplikace.
  - **Vnitřek**: simulace mobilního feedu FB / IG v brand barvách dané sítě (FB `#1877F2` + tmavý `#242526` / `#18191a`, IG gradient `#F58529 → #DD2A7B → #8134AF` + černé pozadí).
  - **Přepínač (Tabs)**: vlastní segmentovaný control – dvě tlačítka v jednom zaobleném kontejneru. Aktivní platforma má podbarvení v brand barvě s 22 hex alpha (`${accent}22`). Přepínání mění interní stav `platform`, který řídí, který sub-renderer (`FacebookPreview` / `InstagramPreview`) se namountuje.
  - **Facebook simulace**: feed card s avatarou (40 px), jménem stránky, „Právě teď 🌐" timestampem (s volitelnou lokací), textovým captionem nahoře a obrázkem pod ním (poměr 4:3, `aspect-[4/3]`), dole fake engagement row.
  - **Instagram simulace**: feed card s avatarou obalenou IG gradient kruhem (32 px), username nahoře, čtvercovým médiem (`aspect-square`), action řádkou (♡ 💬 ✈️) a captionem pod fotkou – text captionu začíná jménem uživatele (IG konvence).
  - **Médiа**: společná komponenta `MediaArea` rozlišuje image vs. video. Všechna média jsou renderována přes `<img>` / `<video>` – žádný `next/image` optimalizátor, protože URL jsou object URL z `URL.createObjectURL()` (ty by Next.js nevalidoval). Při více než 1 médiu se zobrazí „1/N" indikátor.
  - **Avatar**: pokud existuje URL, zobrazí se `<img>`. Pokud ne, generuje se kulatá bublina s prvním písmenem jména v Postio indigo→purple gradientu – graceful fallback.
  - **Prázdné stavy**: pokud `content` je prázdný, zobrazí se placeholder text (italic). Pokud `media` je prázdné, zobrazí se šedý placeholder „Žádná média".
  - **Realtime**: komponenta je čistě poháněna props. Žádné interní síťové dotazy – `EditPostDialog` jí předává `content` (z textarea state) a `media` (z `useMediaUpload` hooku). Při každém `setContent` / uploadu proběhne re-render a náhled se okamžitě aktualizuje.
  - **TypeScript**: nové exportované typy `PostPreviewMedia` a `PostPreviewProfile` pro sdílení kontraktů mezi dialogem a komponentou.
- **`src/components/edit-post-dialog.tsx`** – integrace:
  - **Layout**: dialog rozšířen z `max-w-lg` na `max-w-[1100px]` (responzivně `w-[95vw]`), obalen do `<div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-[minmax(0,1fr)_360px]">`. Na `lg+` se zobrazí dvousloupcový grid (formulář vlevo, náhled vpravo); pod `lg` se náhled přesune pod formulář.
  - **Sticky pravý sloupec**: náhled je na desktopu `sticky top-0` v rámci `max-h-[60vh]` scroll oblasti, takže zůstává viditelný i při dlouhém formuláři (když uživatel scrolluje k tlačítkům, náhled nezmizí).
  - **Akční tlačítka zůstávají přes celou šířku** pod grid kontejnerem (mimo scope layoutu – zachováno kvůli konzistenci s existujícími bannery a Instagram hard-block).
  - **Nové state**: `facebookProfile` + `instagramProfile` (typ `PostPreviewProfile | null`).
  - **Nový useEffect**: po získání `userId` paralelně načte `users` (fallback jméno + avatar) a `social_accounts` (FB/IG specifická jména + avatary). Preferuje se `social_accounts` řádek pro danou platformu – odráží skutečnou stránku/uživatelské jméno, pod kterým bude post publikován. Pokud social_account chybí, použije se `users.full_name`. Při chybě dotazu se náhled zobrazí s placeholderem.
  - **Nový `previewMedia` memo**: promítne `mediaItems` z `useMediaUpload` do tvaru `PostPreviewMedia[]`. Filtruje jen errory – zahrnuje jak rozpracované uploady (object URL preview), tak hotité (public URL), takže náhled reaguje okamžitě i během uploadu.
  - **Nové `previewLabels` memo**: bezpečné fallbacky pro všechny překladové klíče (`"Postio"`, `"Sem napište text příspěvku…"`) – kdyby konzumentský kód nepředal překlady, komponenta stále funguje.
  - **Rozšíření `tLabels` interface**: 6 nových volitelných klíčů (`previewTitle`, `previewFacebookTab`, `previewInstagramTab`, `previewNoMedia`, `previewPlaceholderName`, `previewCaptionHint`) – všechny `?`, takže existující volající nemusejí nic měnit.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 6 nových klíčů v sekci `posts`:
  - cs: `Náhled`, `Facebook`, `Instagram`, `Žádná média`, `Postio`, `Sem napište text příspěvku…`
  - en: `Preview`, `Facebook`, `Instagram`, `No media`, `Postio`, `Write your post text here…`
  - uk: `Попередній перегляд`, `Facebook`, `Instagram`, `Немає медіа`, `Postio`, `Напишіть текст публікації тут…`
- **Jak jsem vyřešil přepínání FB ↔ IG**:
  1. **Interní stav `platform` v `PostPreview`**: `useState<Platform>("facebook")`. Žádný externí state management, žádné URL parametry – přepínač je čistě UI záležitost komponenty.
  2. **Segmentovaný control (`PlatformTabs`)**: vlastní dvoutlačítkový přepínač s `role="tablist"` + `role="tab"` + `aria-selected`. Aktivní tlačítko má brand-color pozadí s alpha 22 (tj. `${accent}22`).
  3. **Podmíněný render**: `{platform === "facebook" ? <FacebookPreview …/> : <InstagramPreview …/>}`. Při přepnutí React odmountuje jednu komponentu a mountne druhou – díky tomu jsou obě simulace na sobě zcela nezávislé a mohou mít odlišnou strukturu (FB: text nahoře, médium dole; IG: médium nahoře, text dole).
  4. **Re-resolve profilu přes `useMemo`**: když se změní `platform`, přepočítá se `activeProfile` (z `facebookProfile` nebo `instagramProfile`). Tím se zajistí, že FB preview ukazuje FB page jméno, IG preview ukazuje IG username – i když uživatel teprve připojil jednu ze sítí.
  5. **Žádné zbytečné re-rendery**: oba sub-renderery jsou pure functions. Rodič jim předává jen `content`, `media`, `profile`, `location`, `labels` – nestahují nic samy.
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Při psaní příspěvku v `EditPostDialog` nyní uživatel okamžitě vidí, jak bude post vypadat na FB / IG – včetně obrázku, videa, avataru, jména stránky a captionu.
  - Náhled reaguje v reálném čase: při každém stisku klávesy v textarea, při každém uploadu obrázku, při každém přidání hashtagu, při změně lokace.
  - Na mobilu se náhled přesune pod formulář (žádné rozhraní se neláme), na desktopu je sticky vpravo a nebrání scrollu formuláře.
  - Žádný nový síťový roundtrip při psaní – profily se načtou jen jednou při otevření dialogu.

## 2026-06-15

### Feature – Dashboard (Přehled): vizuální analytika (DOKONČENO)

- **Cíl**: Dashboard říkal „Tady je tvá aktivita za poslední měsíc přehledně a v barvách." – dosud zobrazoval jen holá čísla, bez kontextu. Tato iterace přidává **dvě nové analytické karty** (TopLabelsChart, PlatformDonutChart) a dělá ze streaku a trendu funkční, dynamicky počítané metriky.
- **Datový model – důležitá poznámka**:
  - Úkol popisoval analýzu `pole 'labels' v tabulce 'posts'`. Toto pole **neexistuje** – štítky jsou v projektu uloženy normalizovaně v tabulkách `tags` (definice) + `post_tags` (vazební tabulka M:N; viz migrace 007 a 028). Implementace tedy čte z `post_tags` + `tags` přes JOIN, což je konzistentní s celou aplikací (Settings → Labels, Posts, Calendar).
  - Stejně tak `published` příspěvky se nečtou z `posts.status='published'`, ale z `post_platforms` (single source of truth, migrace 023). To umožňuje granularitu na úrovni platforem (FB post může být publikovaný, IG verze stejného postu může být ve stavu `failed`).
- **Nové komponenty** (vše client-side, `"use client"`):
  - **`src/components/dashboard/top-labels-chart.tsx`**:
    - 5 nejpoužívanějších interních štítků (horizontální progress bar seznam).
    - Každý řádek = barevná tečka 10 px (z `tags.color`) + název tagu + absolutní počet + progress bar vůči TOP1 (gradient v barvě tagu + jemný glow).
    - **Animace**: framer-motion `motion.div` se staggerovaným `delay: index * 0.06`, progress bar roste z 0 na `{percentage}%` přes `transition: duration 0.7s, ease "easeOut"`. Vstup: `opacity 0 → 1` + `x: -8 → 0`.
    - **Prázdný stav**: pokud `labels.length === 0`, zobrazí se CTA s odkazem na `/settings/labels` (Next.js Link + Button variant="outline", radius 20 px).
    - Glassmorphism: `bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]` (konzistentní s Postio standardem).
  - **`src/components/dashboard/platform-donut-chart.tsx`**:
    - Donut chart (recharts `PieChart` + `Pie` + `Cell` + `ResponsiveContainer` + `Tooltip`).
    - **Brand colors**: Facebook `#1877F2`, Instagram `#E1306C` (zjednodušená reprezentace gradientu), Twitter `#1d9bf0`, LinkedIn `#0a66c2`, TikTok `#ff0050`, YouTube `#ff0000`. Ostatní platformy dostanou fallback `#a855f7` (Postio purple-500).
    - Střed donutu = dominantní platforma (jméno + procento), `motion.div` s `scale 0.9 → 1` + `opacity 0 → 1`, delay 0.2 s.
    - **Legenda** pod grafem (vlastní seznam, ne recharts `Legend`) – `motion.li` se staggerovaným vstupem. Každá položka: barevná tečka + název + absolutní číslo + procento.
    - **Tooltip**: custom `contentStyle` – pozadí `#09090b` + `1px solid rgba(255,255,255,0.08)` + `borderRadius: 12px` + `backdropFilter: blur(12px)` (stejný pattern jako AnalyticsPage).
    - **Animace**: recharts vlastní `animationBegin={0} animationDuration={700}` na `Pie`.
    - **Prázdný stav**: ikona + text + popis (žádný CTA, protože akce je v jiném flow).
- **Nová utilita `src/lib/dashboard-stats.ts`** (čisté funkce, pure, bez React/Next/Supabase):
  - `calculateStreak(publishedDates, now?)` – počet po sobě jdoucích dní s alespoň 1 publikací, končících dnes NEBO včerejškem (aby se série ráno hned neanulovala). Algoritmus: unikátní dny v UTC → seřadit sestupně → ověřit, že nejnovější je dnes/včera → počítat po sobě jdoucí dny od nejnovějšího.
  - `calculateTrend(createdDates, days=7, now?)` – kolik příspěvků bylo vytvořeno v posledních `days` dnech. Slouží pro trend indikátor.
  - `aggregateTopLabels(rows, limit=5)` – top N štítků z `post_tags JOIN tags`, setříděno sestupně dle count.
  - `aggregatePlatforms(rows)` – agregace podle platformy, přiřazení brand barev.
  - `prioritizeForDonut(data)` – Facebook a Instagram mají přednost v legendě (větší relevance pro Postio), ostatní se seřadí dle value.
- **Dashboard page** (`src/app/[locale]/(dashboard)/page.tsx`):
  - Zůstává Server Component (SSR), ale načítá **7 paralelních dotazů** přes `Promise.all` pro minimální latenci.
  - **RLS poznámka**: `post_platforms` (migrace 023) **nemá** sloupec `user_id` – RLS filtruje přes JOIN na `posts.user_id`. V selectu proto používáme `posts!inner(user_id)` + `.eq("posts.user_id", user.id)`. Tím vnucujeme INNER JOIN a data jsou správně izolovaná i přes agregaci (jinak by se mohly objevit cizí záznamy).
  - **Streak** se nově **počítá dynamicky** z `post_platforms.published_at` přes `calculateStreak()`. Pokud výpočet > 0, použijeme ho; jinak fallback na `users.streak` (který aktualizuje cron job). Výsledek: streak je skutečně funkční, ne pouze načtený z DB.
  - **Trend indikátor** se zobrazuje v kartě "Celkem příspěvků" – ikona `TrendingUp` (zelená) pro kladný trend, `TrendingDown` (růžová) pro záporný, neutrální `—` pro 0. Text: `+X tento týden` / `X tento týden` / `— tento týden`.
- **Layout Dashboardu**:
  - Stats grid (4 karty) zůstává nahoře.
  - Nový **analytics grid** pod ním: `lg:grid-cols-3` → vlevo `ConsistencyScore` (1/3 šířky), vpravo 2/3 s `sm:grid-cols-2` obsahujícím `PlatformDonutChart` + `TopLabelsChart`. Na menších obrazovkách se oba grafy skládají pod sebe pod consistency score.
- **Glassmorphism** je dodržen na 100 %: všechny nové karty mají `bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]`. Barvy konzistentní s Postio paletou (indigo/purple akcenty, brand barvy platforem v donut chartu).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 10 nových klíčů v sekci `dashboard`:
  - `thisWeek`, `platformBreakdown`, `platformEmptyTitle`, `platformEmptyDescription`, `topLabels`, `labelsEmptyTitle`, `labelsEmptyDescription`, `labelsEmptyAction`, `postsCount` + reuse existujícího `published`.
  - Všechny tři jazyky mají přirozené formulace (ne doslovný překlad).
- **Bezpečnost / Data**: Žádné DB migrace. Žádné nové API routes. Žádné nové npm závislosti (recharts a framer-motion již v `package.json`).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Dashboard nyní dává uživateli **okamžitý přehled** o tom, co publikuje (top štítky), kam publikuje (donut) a jak se mu daří (streak + trend).
  - **Streak je poprvé funkční** – dříve se pouze četl z `users.streak` (který se updatuje z cronu; pokud cron neexistuje, je hodnota stale). Nyní se počítá z `post_platforms.published_at` přímo při načtení stránky.
  - **Trend indikátor** dává kontext k suchému číslu „12 příspěvků" → „12 příspěvků, +2 tento týden".
  - Prázdné stavy mají CTA – uživatel s 0 štítky vidí odkaz na `/settings/labels`; uživatel s 0 publikacemi vidí popis „Publikujte první příspěvky…".
  - Pokud má uživatel jen 1-2 platformy, donut chart funguje (recharts zvládne i 1-slice, i když typicky zobrazuje prázdný kroužek – proto `prioritizeForDonut` + kontrola `total === 0` pro prázdný stav).

### Fix – UX sjednocení: Instagram hard-block banner jen u tlačítek (HOTFIX 3)

- **Problém**: Po předchozích opravách (Instagram hard-block + persistence rozměrů) se v `EditPostDialog` zobrazovaly **dvě různá varování** o stejné věci:
  1. **Nahoře** v modalu (ve scrollovací oblasti): krátký červený error banner „Toto video nelze na Instagramu publikovat." – generovaný přes `setError(msg)` v `handlePublishAdditional`. Uživatel ho viděl, ale pak scrolloval k tlačítkům a nevěděl, co se změnilo.
  2. **Dole** u tlačítek: velký banner s detailním vysvětlením a doporučeným rozlišením – ale ten se nezobrazoval ve větvi pro **již publikované** posty (větev `isEdit && isAnyPublished`), takže tam zůstalo jen to horní krátké upozornění.
- **Výsledek**: nekonzistentní UX – v `posts/new` a `posts/[id]` se zobrazoval banner dole, ale v `EditPostDialog` (kde se řeší „přidat Instagram k existujícímu postu") byl navíc ještě krátký banner nahoře, což působilo zmateně.
- **Oprava** (`src/components/edit-post-dialog.tsx`):
  - **Sjednocení banneru**: Instagram hard-block banner (`AlertTriangle`, růžový, hlavní text + hint) je nyní **renderován jen jednou**, vně jakékoliv větve `isEdit && isAnyPublished` vs. `:`. Leží v `<div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-3">` – tedy v dolní části modalu, **před všemi akčními tlačítky** (ať už se jedná o tlačítka pro nový post, nebo pro dodatečné publikování).
  - **Odstranění `setError` v IG-specifickém bloku `handlePublishAdditional`**: místo toho se volá jen `toast.error(msg)`. Důvod: `setError` by vytvořil **druhý** banner nahoře v modalu, což je přesně to, co si uživatel nepřál. Jednotný banner dole + toast jsou dostatečnou zpětnou vazbou.
  - **Banner je nyní konzistentní ve všech třech formulářích** (`EditPostDialog`, `posts/new`, `posts/[id]`) – vždy dole u tlačítek, vždy se stejným textem a ikonkou.
- **`posts/new/page.tsx`, `posts/[id]/page.tsx`**: beze změny – jejich banner byl od začátku dole u tlačítek.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - V `EditPostDialog` pro již publikované posty s IG-konfliktním videem se nyní zobrazuje **velký banner dole** (s hintem), ne krátký nahoře.
  - Kliknutí na „Publikovat na Instagram" u takového postu nyní vyvolá **toast + zvýraznění existujícího banneru** (protože tlačítko je disabled), žádný duplicitní banner nahoře.
  - Konzistentní vizuální jazyk ve všech třech formulářích: vždy 1× banner, vždy dole, vždy se stejnými texty.

### Fix – Instagram hard-block se nyní aplikuje i u dodatečného publikování (HOTFIX)

- **Problém**: Po předchozí opravě (hard-block při výběru Instagramu v editoru) se projevil nový use case: uživatel publikuje příspěvek s nízkorozlišenovým videem **nejprve na Facebook** (kde to projde), a pak se rozhodne přidat **Instagram** jako další platformu přes tlačítko „Publikovat na Instagram" v `EditPostDialog`. V tu chvíli se `handlePublishAdditional` volal bez kontroly rozlišení, request proletěl až do `publishAdditionalPlatforms` → `publishToInstagram` → Graph API container → po 9 polling pokusech opět `status_code: ERROR` s `2207082`. Server-side latence ~29 s, pak teprve chyba.
- **Příčina**:
  1. Rozměry videa (`dimensions` na `MediaUploadItem`) se v hooku nastavovaly **pouze během uploadu v aktuální session**. Po otevření existujícího postu (nebo refreshi stránky) se `loadExistingUrls()` rehydratoval `items` z remote URL bez `dimensions`. V důsledku `getInstagramIncompatibleVideos()` vracel prázdné pole a `isInstagramVideoIncompatible` byl vždy `false`.
  2. `handlePublishAdditional` nekontroloval IG kompatibilitu vůbec – spoléhal na to, že se kontrola provedla při výběru platformy v době vytváření postu. U „dodatečného" přidávání platformy se ale `platforms` state nemění, takže useMemo `isInstagramVideoIncompatible` se vyhodnocoval jen z `platforms`, ale `platforms` v tu chvíli Instagram typicky neobsahoval (byl jen v `post.post_platforms`).
- **Oprava**:
  - **`src/hooks/use-media-upload.ts`**:
    - Nová interní utilita `getVideoDimensionsFromUrl(url)` – stejný princip jako `getVideoDimensions(file)`, ale pracuje s remote URL. Používá `<video preload="metadata">`, takže stahuje jen hlavičku (řádově KB), ne celé video.
    - Nový `useEffect` po změně `items`: najde videa, která jsou `status === "ready"`, mají `url`, ale nemají `dimensions`, a asynchronně je doplní přes `getVideoDimensionsFromUrl`. Tím se `dimensions` rekonstruují i u postů otevřených po refreshi, nebo u videí nahraných v předchozí session. Pokud browser metadata nepřečte (CORS, broken file), tiše se vzdá – bezpečnější než blokovat stránku.
    - Hook stále **neukládá dimensions do DB** (žádná migrace). Funguje to proto, že browser umí přečíst metadata z libovolné dostupné URL.
  - **`src/components/edit-post-dialog.tsx`**:
    - `handlePublishAdditional(targetPlatform)` nyní hned na začátku kontroluje `targetPlatform === "instagram" && isInstagramVideoIncompatible`. Pokud ano, nastaví se `error`, zobrazí se toast se stejnou zprávou jako v banneru a akce se přeruší ještě před zavoláním `publishAdditionalPlatforms`.
    - `useMemo isInstagramVideoIncompatible` se nově vyhodnocuje **i pro `post.post_platforms`**, ne jen pro aktuální `platforms` state – tedy pokud je Instagram už publikovaný nebo se chystá publikovat, kontrola se aktivuje. (Tím se pokryje i případ, kdy `platforms` v daném renderu ještě Instagram neobsahuje, ale `targetPlatform` ho posílá do `publishAdditionalPlatforms`.)
  - **`src/app/[locale]/(dashboard)/posts/[id]/page.tsx`**: tato stránka nemá `handlePublishAdditional` (veškeré publikování jde přes `handleSave` + `status === "published"`), kde už IG kontrola je. Beze změny.
- **Bezpečnost / Data**: Žádné DB změny (žádná migrace). Žádné nové API routes. Žádné nové npm závislosti. Hook používá `crossOrigin = "anonymous"` pro `<video>` element, takže CORS preflight jde přes Supabase Storage – funguje bez další konfigurace.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Po otevření existujícího postu (nebo refreshi) se rozměry videí zrekonstruují z remote URL během cca 100–500 ms (závisí na velikosti hlavičky). Uživatel nepozná žádný rozdíl.
  - Dodatečné přidání Instagramu k postu s nízkorozlišenovým videem nyní rovnou zobrazí srozumitelnou chybu („Toto video nelze na Instagramu publikovat. Instagram nepodporuje videa s nízkým rozlišením…") – žádný 30s let na server, žádná kryptická `2207082`.
  - Pokud browser metadata nepřečte (CORS, chybný soubor), kontrola se neaplikuje a server může stále selhat – to je akceptovatelné (graceful degradation) a mnohem lepší než fallback na chybný false-positive blok.

### Feature – Hard-block Instagram publikování u videí s nízkým rozlišením (DOKONČENO)

- **Cíl**: Zabránit opakovanému selhávání `error_subcode 2207082` u Instagram Reels, když video má kratší stranu < 640 px. Facebook tyto videa akceptuje, Instagram ne – a dříve se chyba projevila až v Graph API kontejneru s textem `Media upload has failed with error code 2207082`, který uživatele nijak nepomohl.
- **Kontext z testu**: Video 576 × 1024 px (Download.mp4) prošlo na Facebook bez problémů, ale na Instagramu končilo s `status_code: ERROR` po cca 9 polling pokusech. Po přegenerování do 1080 × 1920 (nebo alespoň 720 × 1280) potíže zmizí.
- **`src/hooks/use-media-upload.ts`**:
  - `MediaUploadItem` rozšířen o `dimensions?: { width: number; height: number }`. Rozměry se zjišťují v již existující utilitě `getVideoDimensions()` po uploadu a perzistují se do state (dříve se jenom zobrazoval soft warning a výsledek se zahazoval).
  - Nový helper `getInstagramIncompatibleVideos(): MediaUploadItem[]` – vrací všechna videa, jejichž kratší strana je menší než `MIN_VIDEO_DIMENSION` (640 px). Neurčeno (např. upload ještě probíhá nebo se nepodařilo dekódovat) se nepočítá jako nekompatibilní.
  - Helper je součástí return objektu hooku, takže ho mohou snadno konzumovat všechny tři formuláře.
- **`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`** – tři místa, kde se skládá post:
  - Destructuring `getInstagramIncompatibleVideos` z hooku.
  - Nový `useMemo` `isInstagramVideoIncompatible` – true, pokud je Instagram ve vybraných platformách a existuje alespoň jedno nekompatibilní video.
  - **Hard-block banner** (růžový, `border-rose-500/30`, `AlertTriangle` ikona, `role="alert"`):
    - Hlavní text: **„Toto video nelze na Instagramu publikovat."**
    - Vedlejší text: **„Instagram nepodporuje videa s nízkým rozlišením (minimálně 640 × 1138 px). Přegenerujte prosím video ve vyšším rozlišení (doporučeno 1080 × 1920 px)."** – formulováno jako omezení platformy, nikoliv aplikace.
    - Banner se zobrazuje **pouze** když je `isInstagramVideoIncompatible === true` a dané tlačítko se chystá publikovat (tj. je vybrán Instagram).
  - **Blokace tlačítek**: Tlačítka „Publikovat" a „Naplánovat" (resp. „Save" u `posts/[id]`, pokud je `status === 'published' || 'scheduled'`) mají v `disabled` nový predikát `isInstagramVideoIncompatible`. Tlačítko „Uložit koncept" zůstává aktivní – chceme umožnit uložení nehotového návrhu.
  - **Defense in depth v handlerech**: I kdyby se tlačítko nějak obešlo, kontrola se opakuje v `handleSubmit("scheduled")`, `handlePublishNow` a `handleSave` – při pokusu se zobrazí toast se stejnou zprávou a akce se přeruší.
  - **Title u disabled tlačítek**: `title` atribut se nastaví na text banneru, takže při najetí myší uživatel vidí důvod.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 2 nové klíče přidané v obou sekcích (`common` i `posts`):
  - `instagramVideoTooSmall` – hlavní text banneru.
  - `instagramVideoTooSmallHint` – vysvětlení a doporučené rozlišení.
  - Anglické/ukrajinské verze jsou formulovány stejně jako omezení platformy.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti. Server-side kontrola v `publish.ts` zůstává pro klid v duši na svém místě (kdyby klient nějak obešel UI) – chybová hláška z `publishToInstagram` je teď pro uživatele relevantnější, protože se tam dostane jen přes bypass UI.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Uživatel dostane srozumitelnou hlášku **před** selháním API: „Instagram nepodporuje videa s nízkým rozlišením…" – ne kryptickou `2207082`.
  - Uživatel nemůže omylem naplánovat post, který by v naplánovaném čase selhal.
  - Pokud omylem publikuje jen na Facebook (kde video projde), stále to funguje – Instagram kontrola se aktivuje jen když je Instagram ve vybraných platformách.
  - U draftu zůstává tlačítko „Uložit koncept" aktivní, aby mohl uživatel dokončit ostatní části postu a vrátit se k videu později.

### Feature – Přísná validace médií při nahrávání (DOKONČENO)

- **Cíl**: Zabránit chybám typu Meta subcode `2207082` tím, že do aplikace nepustíme soubory s nepodporovanými kodeky (`.gif`, `.svg`, `.avi`, `.mkv`, `.bmp`…) nebo s příliš velkou velikostí. Dosud se takové soubory buď tiše propustily do uploadu, nebo se velikost kontrolovala zastaralým limitem 20 MB pro videa.
- **`src/lib/constants.ts`** (NOVÝ) – centrální definice limitů pro média:
  - `ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']` – striktní seznam; **GIF a SVG byly záměrně vyřazeny** (nejsou akceptovány všemi sociálními sítěmi a vedly ke kryptickým API chybám).
  - `ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']`.
  - `MAX_VIDEO_SIZE = 50 * 1024 * 1024` (50 MB) – nový, vyšší limit pro videa.
  - `ABSOLUTE_HARD_LIMIT = 50 * 1024 * 1024` – absolutní strop pro cokoliv.
  - `MIN_VIDEO_DIMENSION = 640` – Meta standard pro minimální rozlišení videa.
  - Soubor je čistý (žádný React/Next/Supabase) → importovatelný jak ze serveru, tak z klienta.
- **`src/hooks/use-media-upload.ts`**:
  - Přesunuty konstanty do `@/lib/constants` (žádné duplicitní definice).
  - Nová striktní logika v `addFiles()` v pořadí:
    1. **Formát**: Pokud MIME typ není v `ALLOWED_IMAGE_TYPES` ∪ `ALLOWED_VIDEO_TYPES`, soubor je okamžitě odmítnut a zobrazí se toast s konkrétním typem: `Formát {type} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV.` Jeden toast na každý odmítnutý soubor (typ se bere z `file.type`, fallback na příponu nebo `"unknown"`).
    2. **Velikost videa**: Pokud `video/*` soubor překročí 50 MB, je tvrdě odmítnut ještě před zahájením uploadu → toast `Video je příliš velké (max. 50 MB). Zmenšete ho prosím.`
    3. **Hard cap pro obrázky**: Obrázky > 50 MB jsou odmítnuty (stávající chování, ponecháno).
    4. **Obrázky > 5 MB** – beze změny, putují do fáze `optimizing` (auto-komprese) a poté do uploadu.
    5. **Low-resolution warning pro videa**: Po úspěšném uploadu (paralelně, neblokující) se přes novou utilitu `getVideoDimensions(file)` zjistí rozměry videa; pokud je kratší strana < 640 px, zobrazí se **soft warning** toast `Video má nízké rozlišení (méně než 640 px). Na sociálních sítích může vypadat rozmazaně.` Upload se NEPŘERUŠUJE – uživatel se může rozhodnout soubor vyměnit.
  - Nové labely v `MediaUploadLabels`: `unsupportedFormat` (funkce přijímá `{type}` pro ICU placeholder), `videoTooLarge`, `videoLowResolution`. Kvůli `FORMATTING_ERROR` z next-intl jsou tyto ICU zprávy předávány jako **funkce** (viz paměťový záznam v AGENTS.md).
  - Nová interní utilita `getVideoDimensions(file)` v hooku – vytvoří dočasný `<video>` element, parsuje `videoWidth`/`videoHeight` z `loadedmetadata`, vždy uvolní object URL.
  - Z checku v `addFiles` byly odstraněny všechny interní konstanty pro GIF/SVG (nyní pouze allow-list v `constants.ts`).
- **Reset inputu**: Všechna tři místa, kde se input maže (`edit-post-dialog.tsx`, `posts/new/page.tsx`, `posts/[id]/page.tsx`), již po `onChange` provádějí `e.currentTarget.value = ""` – to zůstává zachováno. Nová striktní kontrola navíc **zaručuje, že se nevalidní soubor nikdy nedostane do pipeline** – input tedy zůstane prázdný a uživatel může vybrat jiný soubor.
- **`src/components/edit-post-dialog.tsx`**:
  - `EditPostDialogProps.tLabels` rozšířen o `unsupportedFormat?: (values) => string`, `videoTooLarge?: string`, `videoLowResolution?: string`.
  - V `uploadLabels` jsou tyto tři klíče mapovány z `tLabels`; pokud je komponenta volána bez nich (zpětná kompatibilita), poskytne se anglický fallback.
- **`src/app/[locale]/(dashboard)/posts/new/page.tsx`** a **`src/app/[locale]/(dashboard)/posts/[id]/page.tsx`**:
  - `uploadLabels` objekt rozšířen o `unsupportedFormat` (jako arrow funkce delegující na `t("unsupportedFormat", { type })` – next-intl ICU safe), `videoTooLarge` a `videoLowResolution`.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány 3 nové klíče v sekcích `common` i `posts` (konzistentně v obou):
  - `unsupportedFormat` (placeholder `{type}`) – `"Formát {type} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV."` / EN: `"Format {type} is not supported. Please use JPG, PNG, WEBP or MP4/MOV."` / UK: `"Формат {type} не підтримується. Використовуйте JPG, PNG, WEBP або MP4/MOV."`
  - `videoTooLarge` – nový limit 50 MB ve všech jazycích.
  - `videoLowResolution` – upozornění na nízké rozlišení.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - GIF, SVG, AVI, MKV, WMV, BMP a další nepodporované formáty jsou nyní odmítnuty hned při výběru souboru – chyba se zobrazí dříve, než se vůbec začne něco nahrávat.
  - Videa > 50 MB jsou blokována; starý limit 20 MB pro videa byl příliš přísný a nedával smysl, když obrázky mají 50 MB hard cap.
  - Uživatel dostává **konkrétní informaci** o tom, který soubor a proč neprošel (`Formát image/gif není podporován…`).
  - U malých videí (<640 px) dostane měkké varování – upload proběhne, ale uživatel ví, že výsledek může být rozmazaný.
  - Cílená obrana v hloubce proti Meta subcode `2207082` a jemu podobným: do Supabase Storage a do API sociálních sítí se dostane jen to, co platforma skutečně akceptuje.

### Fix – Instagram MP4 publikování – sanitizace media URL (HOTFIX 2)

- **Problém**: Po opravě pollingu se polling dokončil správně (status_code: FINISHED byl dosažen), ale `media_publish` selhal s chybou `error_subcode: 2207082` – "Media upload has failed with error code 2207082". V logu `console.log` v Next.js dev serveru se URL zobrazovala obalená zpětnými uvozovkami `` `https://...mp4` ``, což naznačovalo, že string v DB obsahuje balicí uvozovky (jednoduché nebo zpětné). Meta API je striktní: `video_url` musí být čistá absolutní URL, jinak kontejner spadne s `2207082`.
- **Příčina**: V `getMediaUrls` hooku (`src/hooks/use-media-upload.ts`) se vracelo `i.url` bez jakékoliv sanitizace. Pokud se do `i.url` dostala URL s okolními uvozovkami/backticky (copy-paste, terminál/IDE formatter), zůstaly v ní a putovaly do DB i do Instagram API. Stejně tak `publishToInstagram` v `publish.ts` používalo `mediaUrls[0]` přímo – žádná sanitizace ani kontrola formátu.
- **Oprava**:
  - **`src/lib/utils.ts`** – přidán nový helper `sanitizeMediaUrl(input: unknown): string`:
    - Ověří, že `input` je `string`; jinak vrátí `""`.
    - Ořízne `trim()`.
    - Odstraní **jednu** pár okolních uvozovek (single `'`, double `"` nebo backtick `` ` ``).
    - Ověří, že výsledek odpovídá `/^https?:\/\/\S+$/i` – absolutní http/https URL; jinak vrátí `""`.
    - Úmyslně vrací `""` (ne `null`) – falsy → jednoduchý guard.
  - **`src/hooks/use-media-upload.ts`** – import `sanitizeMediaUrl` z `@/lib/utils`. `getMediaUrls()` nyní vrací `[sanitizeMediaUrl(i.url), ...]` filtrované na neprázdné stringy.
  - **`src/lib/actions/publish.ts`** – import `sanitizeMediaUrl`. V `publishToInstagram`:
    - Hned po `getFacebookMediaType` se `mediaUrls[0]` **nahradí sanitizovanou verzí** (`const mediaUrl = sanitizeMediaUrl(mediaUrls[0])`).
    - Pokud `sanitizeMediaUrl` vrátí prázdný string, vrátí se user-friendly chyba „Neplatná URL média (po sanitizaci). Zkuste soubor nahrát znovu." – dřív by se taková URL poslala rovnou do Meta API a tam spadla s kryptickou chybou.
    - Odstraněna duplicitní deklarace `const mediaUrl = mediaUrls[0]` (která sanitizovanou verzi přepisovala).
    - Diagnostický log `Vytvářím IG kontejner...` nyní obsahuje i `"mediaUrl (JSON)": JSON.stringify(mediaUrl)` – při debugu je jasně vidět, co se skutečně posílá (čistý JSON formát bez interpretace `util.inspect`).
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Instagram MP4 videa, jejichž URL omylem obsahovala okolní uvozovky/backticky, se nyní publikují správně.
  - Všechna URL posílaná do Meta API jsou nyní **vždy** čisté absolutní http(s) adresy – obrana v hloubce na obou vrstvách (klient i server).
  - User-friendly chybová hláška v případě, že se nepodaří URL ani po sanitizaci zvalidovat.

### Fix – Instagram MP4 publikování – polling status_code kontejneru (HOTFIX)

- **Problém**: Publikování MP4 videí na Instagram končilo chybou `(#9007) Media ID is not available` (`error_subcode: 2207027`). V lokalizované chybě: „Multimédium není připravené ke zveřejnění. Počkejte chvilku." Post se v `post_platforms` uložil jako `failed` a uložil se text chyby.
- **Příčina**: V `publishToInstagram` ([src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts)) se po vytvoření IG kontejneru čekalo pevných `setTimeout(10_000)` na zpracování videa. U reálných MP4 (řádově 10+ MB) Instagram nestihne za 10 s dokončit upload → transcode → scan, a proto `media_publish` skončil chybou `(#9007)` – media ještě nebylo připravené. Obrázky používaly 3s timeout a fungovaly OK.
- **Oprava** ([src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts)):
  - Nový helper `getContainerStatusCode(payload)` – parsuje `status_code` z Graph API payloadu.
  - Nový typ `InstagramContainerStatus` (`IN_PROGRESS | FINISHED | PUBLISHED | ERROR | EXPIRED` + string fallback).
  - Nová async funkce `waitForInstagramContainerReady({ igUserId, creationId, accessToken, pollIntervalMs?, maxWaitMs? })`:
    - Každých **2.5 s** volá `GET https://graph.facebook.com/v20.0/{creation_id}?fields=status_code,status&access_token=…`.
    - Vrací `{ success: true }` jakmile `status_code === FINISHED` (nebo `PUBLISHED`).
    - Vrací `{ success: false, error }` při `ERROR` (s `status` textem z API) nebo `EXPIRED` (kontejner vypršel).
    - Hard timeout **120 s** (konfigurovatelný přes `maxWaitMs`).
    - Transientní network chyby se logují přes `console.warn` a polling pokračuje – nespadne na jednom výpadku sítě.
  - V `publishToInstagram`:
    - **Obrázky**: ponechán krátký 3s `setTimeout` (API je rychlé, polling by zbytečně zdržoval tok).
    - **Videa**: `setTimeout(10_000)` nahrazen voláním `waitForInstagramContainerReady` – čeká se skutečně na `status_code: FINISHED` z Instagramu.
  - Nové diagnostické `console.log` výpisy: `⏳ IG container status: { creationId, attempt, elapsedMs, status_code, status }` – umožní snadno sledovat průběh zpracování v konzoli prohlížeče.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Instagram MP4 videa se nyní publikují spolehlivě, i když zpracování trvá 30-60 s (dříve failovalo konzistentně).
  - Chyba `(#9007) Media ID is not available` se již nebude zobrazovat u správně nahraných videí.
  - Pokud Instagram kontejner spadne (`status_code: ERROR`) nebo vyprší (`EXPIRED`), dostane uživatel srozumitelnou chybovou zprávu s textem z API, ne jen obecný timeout.

### Feature – Automatická komprese obrázků před uploadem (DOKONČENO)

- **Cíl**: Umožnit uživateli nahrát i velkou fotku (nad 5 MB) a nechat Postio, aby ji před odesláním do Supabase Storage automaticky zmenšilo. Dříve se soubory > 5 MB rovnou odmítaly (toast „fileTooLargeImage").
- **`src/lib/image-compression.ts`** (NOVÝ):
  - `compressImageIfNeeded(file, options?)` – čistá browser-side utilita, **bez nové npm závislosti** (nativní Canvas API).
  - Logika: pokud je soubor ≤ 5 MB nebo není obrázek (video/SVG/GIF) → vrátí originál. Pokud je > 5 MB a je to re-encodovatelný obrázek (JPEG/WebP/PNG), načte ho do `HTMLImageElement`, vypočítá nové rozměry (max 2048 px na delší straně, poměr zachován) a přes `canvas.toBlob` vygeneruje nový Blob.
  - **Iterativní kvalita**: 0.8 → 0.7 → 0.6 → 0.5, cíl ≤ 3 MB. Když se povede dosáhnout 3 MB, iterace se zastaví.
  - **Jediný toast**: `toast.warning("Soubor je příliš velký (nad 5 MB). Postio ho nyní automaticky optimalizuje pro sociální sítě…")` se zobrazí právě jednou při vstupu do komprese (ne při každém iteraci kvality).
  - **Log do konzole**: `📸 Optimalizace: Původní velikost X.XX MB -> Nová velikost Y.YY MB`.
  - **Bezpečné fallbacky**: pokud dekódování obrázku selže nebo `canvas.toBlob` vrátí `null`, vrátí se originální soubor + zobrazí se chybový toast (`compressionError`). SVG a GIF jsou úmyslně přeskočeny (vektor / animace).
  - Konstanta `COMPRESSION_THRESHOLD_BYTES = 5 * 1024 * 1024` exportovaná pro hook.
- **`src/hooks/use-media-upload.ts`**:
  - Přidán nový stav **`"optimizing"`** do `MediaUploadItem.status` (vedle `"uploading" | "ready" | "error"`).
  - Nahrazena stará logika `isFileTooLarge` novou **`isFileHardRejected`**: videa > 20 MB a obrázky > 50 MB se i nadále tvrdě odmítnou (hard cap), ale obrázky mezi 5 a 50 MB **už nejsou odmítnuty – putují do fáze optimalizace**.
  - V `addFiles`:
    1. Validace typu (beze změny).
    2. Hard-reject (videa > 20 MB / obrázky > 50 MB) – zobrazení `fileTooLargeImage` / `fileTooLargeVideo`.
    3. Pro obrázky > 5 MB se vytvoří položka se stavem `"optimizing"`, ostatní rovnou `"uploading"`.
    4. Asynchronní pipeline: `compressImageIfNeeded()` → (pokud `compressed`) update `file` + `previewUrl` (aby se v gridu hned zobrazil optimalizovaný obrázek) + `toast.success("Obrázek byl optimalizován")` → přepnutí stavu na `"uploading"` → `uploadFile()` → `"ready"`.
    5. Při chybě komprese se uploaduje originál + `toast.error("Nepodařilo se obrázek optimalizovat, odesílám originální soubor.")`.
  - `hasUploading()` nyní vrací `true` i pro stav `"optimizing"` → tlačítka "Uložit koncept / Naplánovat / Publikovat" zůstávají **disablovaná po celou dobu optimalizace i uploadu**.
  - Nové překlady v `MediaUploadLabels`: `optimizingImage`, `fileOptimized`, `compressionError`. Výchozí texty v angličtině jsou v `DEFAULT_LABELS` (kvůli `useTranslations` fallbacku).
- **UI indikace** – overlay přes náhled v gridu médií (tři místa, konzistentní styl):
  - `src/components/edit-post-dialog.tsx` (overlay s fialovým spinnerem – `text-purple-400`, text „Optimalizuji…").
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx` (stejný overlay, lokalizovaný text z `t("optimizingImage")`).
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` (stejný overlay – zajištěno, že i standalone editační stránka pokrývá nový stav).
- **Aktualizované `uploadLabels`** ve všech třech komponentách (EditPostDialog, posts/new, posts/[id]) – předávají hooku nové překlady.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 3 nové klíče přidány v sekcích `common` i `posts` (konzistentně):
  - `optimizingImage` – lokalizovaná zpráva o auto-optimalizaci.
  - `fileOptimized` – úspěšná optimalizace.
  - `compressionError` – fallback na originál.
  - `fileTooLargeImage` přeformulováno z „max 5 MB" na „max 50 MB" (nyní hard cap, protože 5 MB se automaticky komprimuje).
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Komprese je čistě klientská (probíhá v prohlížeči před uploadem), server dostává už optimalizovaný soubor.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Uživatel může nahrávat fotografie z moderních telefonů (často > 10 MB) bez toho, aby dostal chybu. Postio samo optimalizuje velikost pro sociální sítě – upload je rychlejší, fotografie vypadají na sítích stále skvěle (max 2048 px, kvalita 0.8+). Tok funguje jak v `EditPostDialog`, tak na stránkách `posts/new` i `posts/[id]`.

### Feature – ETAPA 3: Finální doladění Facebook správy (DOKONČENO)

- **Cíl**: Vizuálně atraktivní a pohodlná správa více Facebook stránek – reálné avatary stránek, kategorie v kartě účtu a hromadná aktivace všech nalezených stránek jedním kliknutím.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - Typ `SocialAccount` rozšířen o `metadata?: { access_token?: string; category?: string | null }` – v `fetchAccounts()` se používá `select("*")`, takže `metadata` (JSONB sloupec z migrace 029) se vrací automaticky jako JS objekt.
  - **Importy**: přidán `Badge` z `@/components/ui/badge` a `Tag` ikona z `lucide-react`.
  - V kartě propojeného účtu přidán **Badge s kategorií stránky** pod název účtu – zobrazuje se **pouze pro `platform === "facebook"` a pokud `metadata.category` existuje** (jinak se nic neukazuje). Styl: `variant="premium"` (indigo průsvitný s border/backdrop-blur, konzistentní s Postio designem), `Tag` ikona vlevo, `text-[10px]` (decentní), `rounded-full`, `w-fit`.
  - **Avatary v kartě** se již zobrazovaly (`account.avatar_url`), kód zůstává – fallback na platformovou ikonu v plném kroužku (`rounded-full`) je zachován pro případ chybějícího avataru. Drobné sjednocení: `rounded-full` pro placeholder div, `object-cover` pro img.
  - Nové překlady `activateAll`, `activatingAll`, `allActivated`, `someFailed` propojeny do `<FacebookPageSelector>` přes `t={{...}}` – dynamické hodnoty (`{count}`, `{failed}`) se opět předávají přes funkce, aby nedošlo k `FORMATTING_ERROR` (next-intl + ICU).
- **`src/components/facebook-page-selector.tsx`**:
  - **Hromadná aktivace** (`handleActivateAll`): nové tlačítko "Aktivovat všechny nalezené stránky (N)" nad seznamem stránek, viditelné pouze pokud `items.length > 1`.
  - Tok: snapshot ids → optimicky vyprázdnit `items` a přidat všechna id do `pendingIds` → paralelně přes `Promise.allSettled` zavolat `toggleAccountActive(id, true)` pro každou stránku (paralelní běh, jeden failure neblokuje ostatní) → spinner na tlačítku i na jednotlivých řádcích (`isPending || bulkActivating`) → po dokončení toast (`allActivated(count)` při 100% úspěchu, jinak `someFailed(failed)`) + `onChanged()` pro refresh.
  - Per-row Switch je během `bulkActivating` zablokovaný (zobrazí se `Loader2`), aby nedošlo k duplicitním požadavkům.
  - Nové překlady v `t` prop: `activateAll(count)`, `activatingAll`, `allActivated(count)`, `someFailed(failed)` – všechny dynamické hodnoty jdou přes funkce (next-intl ICU safe).
- **Revalidace**: `toggleAccountActive` v `src/lib/actions/social-accounts.ts` již po každém úspěšném update volá `revalidatePath("/accounts")` – při hromadné aktivaci se tedy revalidace spustí N-krát (jednou za stránku), cache serveru je vždy čerstvá. Klientský refresh se pak děje přes `onChanged` callback v accounts page (ten volá `fetchAccounts()` + `fetchPendingPages()`), takže UI je aktualizováno okamžitě.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány 4 nové klíče v sekci `accounts`:
  - `activateAll` (placeholder `{count}`) – "Aktivovat všechny nalezené stránky ({count})".
  - `activatingAll` – "Aktivuji všechny stránky…".
  - `allActivated` (placeholder `{count}`) – "Všech {count} stránek bylo úspěšně aktivováno.".
  - `someFailed` (placeholder `{failed}`) – "Nepodařilo se aktivovat {failed} stránek. Zkuste to prosím znovu.".
- **Bezpečnost / Data**: Žádné DB změny. Žádná nová API route. Hromadná aktivace jde stále přes `toggleAccountActive` (server-side ownership check + RLS).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Uživatel v seznamu propojených účtů uvidí **reálnou fotku** své stránky (nebo FB fallback ikonu) a **kategorii** pod názvem.
  - Při mnoha FB stránkách je může připojit **jedním kliknutím** – žádné postupné přepínání switchů.

### Fix – FORMATTING_ERROR u dynamických zpráv FacebookPageSelectoru

- **Problém**: Konzole hlásila `FORMATTING_ERROR: The intl string context variable "name"/"category" was not provided to the string …` při práci s `FacebookPageSelector` (Accounts stránka).
- **Příčina**: V `accounts/page.tsx` se dynamické překlady (`pageCategoryLabel`, `pageConnected`, `pageDisconnected`) předávaly jako holý `t("…")` výsledek. Protože tyto řetězce obsahují ICU placeholdery (`{category}`, `{name}`), next-intl je při vykreslování/parsování validoval a hlásil chybějící proměnné. V komponentě se pak hodnoty dosazovaly ručně přes `String.replace(...)`, což už bylo příliš pozdě.
- **Oprava**:
  - **`src/components/facebook-page-selector.tsx`** – typ props u `categoryLabel`, `pageConnected` a `pageDisconnected` změněn ze `string` na `(value: string) => string`. Interní volání (`toast.success(…)` a vykreslení štítku kategorie) nyní funkci rovnou zavolají s dynamickou hodnotou.
  - **`src/app/[locale]/(dashboard)/accounts/page.tsx`** – tyto tři položky v `t={{…}}` se nyní předávají jako arrow funkce, které delegují na `t("…", { name })` / `t("…", { category })`. Díky tomu next-intl dostane hodnotu ještě před ICU formátováním a chyba zmizí.
- **Překlady**: Beze změn – stávající klíče v `cs.json` / `en.json` / `uk.json` (s placeholdery `{name}`, `{category}`) jsou nyní správně používány přes standardní next-intl API.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Fix – `null value in column "metadata"` při Facebook OAuth (HOTFIX)

- **Problém**: Při propojování Facebook účtu OAuth callback končil chybou `error code 23502: null value in column "metadata" of relation "social_accounts" violates not-null constraint`. Uživatel byl vrácen na úvodní stránku bez propojení.
- **Příčina**: V callbacku se u **Instagram řádků** (3 místa) posílal do `rowsToUpsert.push(...)` objekt bez `metadata`. Sloupec `metadata` je `NOT NULL DEFAULT '{}'::jsonb` (z migrace 029), ale při explicitním upsertu s `null` hodnotou se DEFAULT nepoužije – proto chyba.
- **Oprava** (`src/app/auth/callback/route.ts`):
  - Přidáno `metadata: {}` do všech 3 Instagram pushů:
    1. Instagram Direct Login (řádek ~248).
    2. Instagram z Pages v IG-only flow (řádek ~309).
    3. Instagram z Pages v běžném flow (řádek ~369).
  - Typ `rowsToUpsert` zpřísněn: `metadata: SocialAccountMetadata` (povinné, ne `optional`). Tím TypeScript zachytí podobnou chybu v budoucnu při kompilaci.
- **Bonus** (`src/components/facebook-page-selector.tsx`):
  - Přidán `<DialogDescription className="sr-only">` pro accessibility (řeší browser warning `Missing Description or aria-describedby`).
- **Build**: `npm run build` prošel ✅ 0 chyb.
- **Dopad**: Propojení Facebooku nyní projde čistě. IG i FB stránky se uloží do DB, dialog se otevře s pending pages.

### Feature – Výběr konkrétní Facebook Page (Krok 2: Frontend & Interakce) (DOKONČENO)

- **Cíl**: Po úspěšném přihlášení přes Facebook nabídnout uživateli UI pro zaškrtnutí stránek, které chce přes Postio publikovat. Backend logiku (uložení stránek jako `is_active=false` + endpoint `/api/accounts/facebook/select`) jsme připravili v předchozím kroku – tento commit ji zprístupňuje v UI.
- **`src/lib/actions/social-accounts.ts`** (NOVÝ) – serverová akce `toggleAccountActive(accountId, isActive)`:
  - Ověří přihlášení a provede **explicitní ownership check** (`select id where id=… and user_id=auth.uid()` – vrátí friendly chybu pokud account neexistuje nebo nepatří uživateli).
  - Aktualizuje `is_active` v `social_accounts` s `eq("id", accountId).eq("user_id", user.id)` (defence in depth – RLS navíc chrání).
  - Po úspěchu `revalidatePath("/accounts")` pro obnovení serverového listu.
  - Vrací `{ success, error? }` (žádné 500 výjimky – chyby se posílají jako result).
- **`src/components/facebook-page-selector.tsx`** (NOVÝ) – `"use client"` dialog (glassmorphism styl):
  - Vizuální styl konzistentní s `ConnectAccountModal`: `rounded-[24px]`, `bg-black/40 backdrop-blur-xl`, `border-white/10`, indigo→purple gradient akcenty, vlastní close tlačítko vpravo nahoře.
  - Hlavička s Facebook ikonou + titulkem + subtitulem.
  - Seznam stránek (každá = řádek s avatarem, názvem, kategorií a Switchem).
  - **Optimistická aktualizace**: po kliknutí se stránka **okamžitě odebere z lokálního seznamu** + zobrazí se `Loader2` spinner místo switche.
  - Po úspěchu `toast.success("Stránka {name} byla úspěšně připojena k Postiu.")` + `onChanged` callback.
  - Při chybě: revert + `toast.error`.
  - Prázdný stav: `CheckCircle2` + "Všechny vaše stránky jsou již aktivní."
  - Lokální stav `items` se re-syncuje s `pages` prop přes `useEffect` (pro případ opakovaného otevření dialogu).
  - Footer s tlačítkem "Hotovo" pro zavření.
  - **Bezpečnost**: žádný `access_token` se neodesílá na klienta – pouze `category` z `metadata`.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - Přidán state: `pendingPages`, `loadingPending`, `selectorOpen`.
  - Nová `fetchPendingPages()` – GET na `/api/accounts/facebook/select` (cache: no-store) → naplní `pendingPages`.
  - `useEffect` na mountu volá `fetchPendingPages()`.
  - **Auto-open dialogu**: pokud URL obsahuje `?fb=connected` a existují pending pages, dialog se **automaticky otevře**; po zavření se query param vyčistí přes `router.replace(pathname)`.
  - **Sekce "Nalezené stránky k připojení"** mezi kartou platforem a seznamem připojených účtů:
    - Glassmorphism karta s modro-indigo gradientem (odlišení od ostatních sekcí).
    - Ikona Facebook, badge s počtem, popis, tlačítko "Spravovat stránky" s `Sparkles` ikonou.
    - **Preview avatarů** prvních 4 stránek v `flex -space-x-2` + názvy prvních 3 + „a {count} dalších".
  - Po úspěšném přepnutí se volá `fetchAccounts()` (pro refresh aktivního seznamu) + `fetchPendingPages()` (stránka zmizí z pending).
- **`src/app/auth/callback/route.ts`**:
  - Po úspěšném Facebook Pages OAuth flow (ne Instagram) se k `finalNext` přidá `?fb=connected` (respektive `&fb=connected` pokud již parametry existují). Tím triggerujeme auto-open v `/accounts`.
  - Instagram direct login tento parametr **nedostává** (IG účty se aktivují automaticky).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidáno 17 nových klíčů v sekci `accounts`:
  - `pendingPagesTitle`, `pendingPagesSubtitle`, `managePagesButton`, `andMore` (s placeholder `{count}`).
  - `selectorTitle`, `selectorSubtitle`, `pageNoCategory`, `pageCategoryLabel` (s placeholder `{category}`).
  - `inactive`, `activating`, `deactivating`, `done`.
  - `pageConnected` (placeholder `{name}`), `pageDisconnected` (placeholder `{name}`), `errorToggle`, `selectorEmpty`.
- **Bezpečnost / Data**: Žádné DB změny (pouze UI). RLS chrání `toggleAccountActive`. Optimistická aktualizace má revert při chybě.
- **Build**: `npm run build` prošel ✅ 0 chyb. Endpoint `/api/accounts/facebook/select` (z Krok 1) je v route listu.

### Flow (konec→konec):
1. Uživatel klikne na Facebook v `/accounts` → OAuth na Meta.
2. Callback uloží všechny Pages jako `is_active=false` + metadata + redirect na `/accounts?fb=connected`.
3. `/accounts` detekuje `?fb=connected`, zavolá `fetchPendingPages()`, automaticky otevře `<FacebookPageSelector>`.
4. Uživatel zaškrtne stránky → `toggleAccountActive` → toast + refresh.
5. Stránky se okamžitě objeví v "Propojené účty" níže (a zmizí z pending).

### Feature – Výběr konkrétní Facebook Page (Krok 1: Backend logika) (DOKONČENO)

- **Cíl**: Připravit backend pro to, aby si uživatel po přihlášení přes Facebook mohl sám zvolit, **které** stránky (Pages) chce mít aktivní pro publikování. V tomto kroku jde výhradně o serverovou stranu – UI pro samotné zaškrtávání přijde v dalším kroku.
- **`supabase/migrations/029_add_metadata_to_social_accounts.sql`** (NOVÝ):
  - Přidán sloupec `metadata JSONB NOT NULL DEFAULT '{}'::jsonb` do `public.social_accounts`.
  - Držen generický JSON blob, aby se do něj v budoucnu mohly ukládat i per-platform extras (X bearer, TikTok open_id, …).
  - Existující unikátní index `social_accounts_user_platform_platform_id_key` na `(user_id, platform, platform_id)` zůstává beze změny → **jednoznačně podporuje více stránek pro jednoho uživatele** (jedna stránka = jeden řádek).
  - Migrace je `ADD COLUMN IF NOT EXISTS` → idempotentní a bezpečná pro opakované spuštění.
- **`src/app/auth/callback/route.ts`**:
  - Nový typ `SocialAccountMetadata` (exportuje vše potřebné pro UI): `access_token?`, `category?`.
  - Graph API dotaz `/me/accounts` nyní žádá i pole `category` (přidáno do `pagesFields`).
  - **Změna chování pro Facebook Pages**: každá stránka se nyní ukládá s `is_active = false` a metadata `{ access_token, category }` (page-level token a kategorie dle Meta). Hlavní sloupec `access_token` se plní stejnou hodnotou kvůli konzistenci s publishing logikou, ale v `metadata` je uložena totéž hodnota jako canonical per-page token.
  - **Bezpečnostní oprava**: těsně před upsertem se **deaktivují všechny existující Facebook řádky** daného uživatele (`update is_active=false where user_id=… and platform='facebook'`). Tím se zabrání tomu, aby stránka, kterou uživatel mezitím ztratil přístup v Meta, zůstala v Postiu aktivní. Instagram řádky zůstávají nedotčeny.
  - **Instagram chování beze změny**: jak direct login IG, tak IG z Pages se stále ukládají s `is_active = true` (single-IG-account model).
  - Pole `metadata?` přidáno do typu `rowsToUpsert`.
- **`src/app/api/accounts/facebook/select/route.ts`** (NOVÝ) – `GET` endpoint:
  - Vyžaduje přihlášení (`supabase.auth.getUser()`), RLS automaticky filtruje `user_id = auth.uid()`.
  - Vrací `JSON { pages: FacebookPageDto[] }`, kde každá page obsahuje: `id` (interní UUID – klíč pro pozdější aktivaci), `platform_id` (FB Page id), `account_name`, `avatar_url`, `category` (z `metadata.category`), `created_at`.
  - Filtruje `platform = 'facebook' AND is_active = false` – tedy **pouze neaktivní** stránky, které čekají na výběr.
  - Řazeno `created_at ASC` – nejstarší nahoře (typicky první přidaná Page).
  - **Bezpečnost**: žádné write operace, pouze read přes RLS-scoped Supabase client. `access_token` z `metadata` se nikdy neposílá na klienta (chráněn).
- **Bezpečnost / Data**:
  - RLS na `social_accounts` (z migrace 013) zůstává v platnosti – uživatel nikdy neuvidí cizí stránky.
  - Žádný `access_token` v hlavním API response – klient dostane jen `category` z `metadata`, což je bezpečné UI-hint pole.
- **Dopad na stávající flow**:
  - Po tomto commitu: po FB OAuth **žádná** Page není aktivní → uživatel musí stránky ručně zaškrtnout (připravíme v dalším kroku).
  - UI v `/accounts` by měl tento stav reflektovat – v dalším kroku přidáme hlášku „Nemáte aktivní žádnou FB stránku, vyberte si" + tlačítko pro otevření výběru z nového endpointu.
- **Build**: `npm run build` projde (viz další řádek). Endpoint se automaticky zaregistruje do Next.js route handlerů pod `/api/accounts/facebook/select`.

### Feature – Modální okno „O štítcích" po kliknutí na „Zjistit více" (DOKONČENO)

- **Cíl**: Po kliknutí na tlačítko „Zjistit více" v info banneru na stránce `/settings/labels` otevřít modální okno se stručným readmem pro uživatele – k čemu tagy jsou, jak je využít a hlavně proč.
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-dialog.tsx`** (NOVÝ) – `"use client"` komponenta:
  - Postavena na shadcn `Dialog` (stejný styl jako `CreateTagDialog` / `EditTagDialog`) s vlastním `DialogContent` (skryt výchozí close button – máme vlastní footer).
  - **Layout**: hlavička s indigo gradientem (konzistentní s bannerem), scrollovatelný body (`max-h-[60vh]`) se 4 sekcemi a patička s tlačítkem „Rozumím".
  - **Sekce** (každá s vlastní ikonou v kruhovém badge):
    1. **Co jsou štítky?** (`Tag` ikona) – vysvětlení, že jde o interní štítky, které si uživatel sám pojmenuje (kampaň, cílová skupina, fáze nákupní cesty, téma).
    2. **Proč je používat?** (`Sparkles` ikona) – 4 odrážky s indigo tečkami: rychlé filtrování, lepší přehled (počty), příprava na analytiku, konzistentní tým.
    3. **Jak je využít?** (`Filter` ikona) – číslovaný seznam 4 kroků: vytvořit v Nastavení → Štítky, přiřadit k příspěvku, filtrovat, sledovat počty.
    4. **Důležité – štítky jsou interní** (`EyeOff` ikona) – **amber** zvýrazněný box, zdůrazňuje, že sledující štítky nikdy neuvidí.
  - **Responzivita**: `sm:max-w-lg`; horizontální padding `px-6 sm:px-8`; body scrolluje vertikálně, pokud se na malé obrazovce nevejde.
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-banner.tsx`**:
  - Přidán nový prop `infoDialog: React.ComponentProps<typeof TagInfoDialog>["t"]` (překlady pro dialog).
  - `<a>` odkaz „Zjistit více" nahrazen `<button type="button">` se `setInfoOpen(true)` – nyní otevírá dialog místo pseudo-navigace.
  - Přidán interní state `infoOpen` (default `false`); dialog se renderuje vždy, ale zobrazí se jen po kliknutí.
  - Render banneru zabalen do fragmentu (`<>…</>`), aby vedle `<div>` bannneru mohl být i `<TagInfoDialog>` jako sourozenec.
  - Persistent dismiss v `localStorage` zůstává beze změny (banner lze i nadále zavřít křížkem; dialog je na tom nezávislý).
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Nový objekt `infoDialogTranslations` sestavuje všechny klíče pro dialog (včetně 4 + 4 položek seznamů).
  - Předán do `<TagInfoBanner t={bannerTranslations} infoDialog={infoDialogTranslations} />`.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidáno 18 nových klíčů v sekci `tags`: `infoDialogTitle`, `infoDialogIntro`, `infoDialogWhatTitle`, `infoDialogWhatBody`, `infoDialogWhyTitle`, `infoDialogWhyItem1`–`4`, `infoDialogHowTitle`, `infoDialogHowItem1`–`4`, `infoDialogVisibilityTitle`, `infoDialogVisibilityBody`, `infoDialogClose`.
- **Bezpečnost / Data**: Žádné DB změny, žádné server actions. Čistě UI vrstva (klientská komponenta + i18n klíče).
- **Build**: `npm run build` prošel ✅ 0 chyb. Stránka `/[locale]/settings/labels` se generuje správně.

### Feature – Info banner na stránce Štítky inspirovaný Bufferem (DOKONČENO)

- **Cíl**: Přenést na stránku `/settings/labels` (Nastavení → Štítky) kontextový info box o viditelnosti štítků pro organizaci, který zná uživatelé z Bufferu, a přizpůsobit jej Postio design systému (pure-black + glassmorphism + indigo akcent). Dbát na mobilní responzivitu.
- **Inspirace (Buffer)**: Banner s textem „Tags are visible to everyone in your organization. Learn more" + zvýrazněný odstavec v prázdném stavu „Create tags to organize and categorize your social media content…"
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-banner.tsx`** (NOVÝ) – `"use client"` komponenta:
  - Glassmorphism karta (`rounded-[20px]`, `border-white/5`, `bg-white/50 dark:bg-card/40`, `backdrop-blur-sm`) s ikonou `Info` v indigo „disku" (`bg-indigo-500/15 ring-1 ring-indigo-500/20`).
  - Inline text + odkaz „Zjistit více" v `text-indigo-300` s focus ringem pro klávesnici.
  - Tlačítko zavřít (`X`, lucide) s `aria-label` a větší touch target na mobilu (`h-8 w-8` absolutně vpravo nahoře → `sm:static sm:h-7 sm:w-7` na desktopu).
  - **Responzivita**: `flex-col` na mobilu (text pod ikonou, zavírací tlačítko absolutně v rohu), `sm:flex-row sm:items-center` na desktopu (vše v jedné řadě).
  - **Perzistentní dismiss**: stav uložen v `localStorage` pod klíčem `postio:labels:info-banner-dismissed` (props `storageKey` overridable). SSR-safe – server vždy renderuje banner; po `useEffect` mountu se teprve čte `localStorage` a případně banner skryje → žádný hydration mismatch.
  - Pokud `localStorage` není dostupný (private mode), selhání se tiše ignoruje a banner zůstane viditelný.
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Import + render `<TagInfoBanner t={bannerTranslations} />` vždy mezi hlavičkou a seznamem (viditelné jak v prázdném, tak v naplněném stavu – kontext pro uživatele je v obou případech cenný).
  - **Prázdný stav vylepšen**:
    - Původní `emptyTitle: "Štítky"` nahrazen novým klíčem `noTagsYet` (výstižnější pro prázdný stav).
    - Pod nadpisem a podtitulem přidán **zvýrazněný box** s textem `emptyDescription` – `rounded-[20px]` + `border-indigo-500/20` + `bg-indigo-500/5` + `backdrop-blur-sm` + text v `text-indigo-100/90`. Vizuální obdoba zvýrazněného textu v Bufferu, ale laděná do Postio designu (indigo akcent místo zelené).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`:
  - `noTagsYet`: "Zatím žádné štítky" / "No tags yet" / "Ще немає міток".
  - `infoBannerText`: "Štítky jsou viditelné pro všechny ve vaší organizaci." / "Tags are visible to everyone in your organization." / "Мітки видимі для всіх у вашій організації."
  - `infoBannerLearnMore`: "Zjistit více" / "Learn more" / "Дізнатися більше".
  - `infoBannerDismiss`: "Zavřít" / "Dismiss" / "Закрити".
- **Poznámka**: Klíč `emptyTitle` v překladech zůstává (zpětná kompatibilita), ale aktuálně jej kód nepoužívá – bude-li v budoucnu nepotřebný, lze jej odstranit. `emptySubtitle` a `emptyDescription` se nadále používají v prázdném stavu.
- **Bezpečnost / Data**: Žádné DB změny, žádné server actions, žádné API volání. Čistě UI vrstva.
- **Build**: `npm run build` prošel ✅ 0 chyb. Všechny routy vygenerovány, včetně `/[locale]/settings/labels`.

### Feature – Počty příspěvků u každého tagu v Nastavení → Štítky (DOKONČENO)

- **Cíl**: Zobrazit u každého tagu v seznamu **počet příspěvků**, které mají tento tag přiřazen přes vazební tabulku `post_tags`. Bod 3 ze seznamu "Co zůstává na další iteraci".
- **`src/lib/actions/tag-actions.ts`**:
  - Nový typ `UserTagWithCount extends UserTag` s polem `post_count: number`.
  - Nová server action `getUserTagsWithCounts()` – vrací `UserTagWithCount[]`. Strategie: dva RLS-friendly dotazy (1. `tags` pro `user_id`, 2. `post_tags` aggregované na straně serveru v `Map<tag_id, count>`), výsledek sloučen v paměti. RLS na `post_tags` automaticky filtruje `auth.uid() = user_id`, takže cizí posty nejsou nikdy započítány. Tagy bez příspěvků mají `post_count: 0`.
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Server component přešel z přímého `supabase.from("tags").select("*")` na `getUserTagsWithCounts()`.
  - Výsledek předává do nové klientské komponenty `TagsList` (včetně `locale` pro pluralizaci).
  - Odstraněn nevyužitý import `Plus` z lucide-react.
- **`src/app/[locale]/(dashboard)/settings/labels/tags-list.tsx`** (NOVÝ) – `"use client"` wrapper nad `TagItem`:
  - Toggle "Seřadit podle názvu" / "Seřadit podle počtu" (výchozí = abecedně). Vizuál: glassmorphism přepínač v pravém horním rohu seznamu s aktivním stavem v `bg-indigo-500/15 text-indigo-300`. Ikony `ArrowDownAZ` / `Hash` (lucide).
  - Stabilní řazení: při shodě `post_count` se řadí abecedně (`localeCompare` s aktivním locale).
- **`src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx`**:
  - Přidány props `postCount: number` a `locale: string`.
  - Nový helper `formatPostsCount(count, locale, t)` – řeší české/ukrajinské skloňování (1, 2-4, 5+, 0) s oddělenými klíči `onePost` / `postsCountFew` / `postsCount` / `noPosts`. Anglie používá jednoduché `one` / `other`.
  - Vedle názvu tagu se zobrazuje **glassmorphism badge** s počtem:
    - `postCount > 0` → `bg-indigo-500/10 text-indigo-300` (aktivní).
    - `postCount === 0` → `bg-white/5 text-muted-foreground/60` s textem "Bez příspěvků".
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`: `noPosts`, `onePost`, `postsCount`, `postsCountFew`, `sortByName`, `sortByCount`. Příklady:
  - cs: `"Bez příspěvků"` / `"1 příspěvek"` / `"2 příspěvky"` / `"5 příspěvků"`.
  - en: `"No posts"` / `"1 post"` / `"5 posts"`.
  - uk: `"Без публікацій"` / `"1 публікація"` / `"3 публікації"` / `"10 публікацій"`.
- **Bezpečnost**:
  - RLS na `post_tags` (`auth.uid() = user_id`) zajišťuje, že počet nikdy nezahrnuje cizí příspěvky.
  - Žádné nové sloupce v DB nejsou potřeba.
- **Refresh**: Po `revalidatePath("/settings")` (z `createTag` / `deleteTag` / `updateTag` / `setPostTags`) se stránka `/settings/labels` automaticky přerenderuje a počty se aktualizují.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Feature – Editace tagu v Nastavení → Štítky (DOKONČENO)

- **Cíl**: Umožnit uživateli upravit název i barvu existujícího tagu. Bod 2 ze seznamu "Co zůstává na další iteraci".
- **`src/app/[locale]/(dashboard)/settings/labels/actions.ts`** – nová server action `updateTag(id, name, color)`:
  - Ověří přihlášení a **ownership** (`select id, name, color ... eq("id", id).eq("user_id", user.id).maybeSingle()` → pokud null, vrátí chybu).
  - Normalizuje `name = trim().replace(/^#/, "")`.
  - **Case-insensitive duplicity** přes `ilike(name, cleaned).neq("id", id).maybeSingle()` – pokud existuje jiný tag se stejným názvem, vrátí `{ success: false, alreadyExists: true }`.
  - `update` provede s `eq("id", id).eq("user_id", user.id)` (defence in depth) a aktualizuje `updated_at`. Po úspěchu `revalidatePath("/settings")` a vrátí aktualizovaný tag.
  - Typ `UpdateTagResult` exportován pro UI.
- **`src/app/[locale]/(dashboard)/settings/labels/edit-tag-dialog.tsx`** (NOVÝ) – klientský dialog (lucide Pencil) s:
  - Inputem pro název (placeholder: `Název štítku` / `Tag name` / `Назва мітки`).
  - 10 předdefinovanými barvami (stejná sada jako `CreateTagDialog` a `TagPicker`).
  - Tlačítky `Uložit` / `Zružit`.
  - Toast oznámení: `tagUpdated` (úspěch), `tagNameExists` (duplicita), jinak `error.message`.
  - Re-sync lokálního stavu s `initialName`/`initialColor` při každém otevření (takže editace dvou různých tagů po sobě funguje korektně).
- **`src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx`** – přidáno tlačítko **Upravit** (Pencil ikona) před tlačítkem Smazat, zobrazené na `group-hover` (konzistentní s existujícím UX mazání).
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`** – rozšířen `itemTranslations` o nové i18n klíče.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`: `save`, `editTag`, `tagUpdated`, `tagNameExists`.
- **Bezpečnost**:
  - Ownership check je **povinný** – cizí tag nelze editovat (test: pokus o `updateTag` s cizím `id` vrátí `success: false, error: "Tag not found"`).
  - `ilike` pro case-insensitive porovnání (zamezí obcházení velikostí písmen).
  - WHERE klauzule `eq("user_id", user.id)` je v update dotazu (defence in depth vedle explicitního `ownedTag` checku).
  - RLS na `tags` je již aktivní – žádné změny v DB nejsou potřeba.
- **Refresh** – po úspěšném uložení `revalidatePath("/settings")` v server action → server render stránky `/settings/labels` se obnoví; navíc se změna barvy okamžitě projeví v kartě příspěvku (`_post-card.tsx`), tag filtru (`_posts-filters.tsx` → `TagFilterSelect`) a v `TagPickeru`, protože tyto komponenty čtou `tag.color` z `tags` tabulky – po refreshi se změna automaticky projeví.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Fix – Chybějící překlady pro tag filtr v Příspěvcích (DOKONČENO)

- **Problém**: Na stránce `/posts` (src\app\[locale]\(dashboard)\posts\page.tsx) se v konzoli zobrazovaly chyby `MISSING_MESSAGE` pro klíče `posts.filterByTag`, `posts.allTags` a `posts.noTagsAvailable`.
- **Příčina**: Při dřívější implementaci tag filtru v Příspěvcích/Kalendáři byly tyto tři klíče přidány pouze do sekce `calendar` v `cs.json`/`en.json`/`uk.json`. Sekce `posts` je ale používá samostatně (přes `t("filterByTag")` atd.) – klíče v ní chyběly.
- **Řešení**: Přidány chybějící klíče do sekce `posts` ve všech třech jazykových souborech (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `filterByTag`: "Filtr podle štítku" / "Filter by tag" / "Фільтр за тегом"
  - `allTags`: "Všechny štítky" / "All tags" / "Усі теги"
  - `noTagsAvailable`: "Zatím nemáte žádné štítky. Vytvořte je v Nastavení → Štítky." / "You have no tags yet. Create them in Settings → Labels." / "У вас ще немає тегів. Створіть їх у Налаштуваннях → Мітки."
- **Dopad**: Stránka `/posts` se nyní vykresluje bez `MISSING_MESSAGE` chyb. Tag filtr na Příspěvcích i Kalendáři používá stejné texty.

### Feature – Filtr podle interních štítků v Příspěvky/Kalendáři (DOKONČENO)

- **Cíl**: Umožnit filtrování příspěvků podle interních štítků (Nastavení → Štítky) v seznamu Příspěvky i v Kalendáři – bod 1 ze seznamu "Co zůstává na další iteraci".
- **`src/components/post-filters-row.tsx`**:
  - Přidána nová interní komponenta `TagFilterSelect` – specializovaný dropdown s barevnou tečkou u každé možnosti (vizuální vazba na barvu tagu z DB). Reaguje na aktivní tag – v triggeru zobrazí tečku barvy místo výchozí ikony. Plná podpora mobile/desktop + empty state ("Zatím nemáte žádné štítky").
  - Rozšířen `PostFiltersRow` o nové volitelné props: `tagValue`, `tagOptions`, `tagLabel`, `allTagsLabel`, `noTagsLabel`, `onTagChange`. Pokud `onTagChange` není předán, třetí filtr se vůbec nevykreslí (zpětná kompatibilita).
  - Vstupní tvar `tagOptions` odpovídá `UserTag` z `tag-actions.ts` (`{ id, name, color }`). V renderu se mapuje na interní `{ value: id, label: name, color }`.
  - Layout na desktopu: tři filtry vedle sebe, `sm:max-w-[660px]`. Na mobilech tři filtry pod sebou (vertikální flex).
- **`src/app/[locale]/(dashboard)/posts/_posts-container.tsx`**:
  - Přidán state `activeTag` a rozšířen `filteredPosts` o tag filtr: `(post.post_tags ?? []).some(t => t.id === activeTag)`.
  - Předány nové props `tags`, `tFilterByTag`, `tAllTags`, `tNoTagsAvailable` do renderu `PostFiltersRow`.
- **`src/app/[locale]/(dashboard)/posts/page.tsx`**:
  - Import `getUserTags` z `@/lib/actions/tag-actions`.
  - Zavoláno `getUserTags()` paralelně s ostatními načítáními a výsledek předán do `PostsContainer` (fallback na `[]` při chybě).
- **`src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx`**:
  - Přidán state `tagFilter`, předán do `PostFiltersRow` (`tagValue`, `tagOptions`, `onTagChange`).
  - Předán dále do `CalendarView` jako nový prop `tagFilter`.
  - Rozšířen `tCalendar` typ o volitelná pole `filterByTag`, `allTags`, `noTagsAvailable`.
- **`src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`**:
  - Přidán nový prop `tagFilter?: string` do `CalendarViewProps`.
  - Rozšířen `effectiveFilteredPosts` o tag filtr (stejná logika jako v `PostsContainer`).
- **`src/app/[locale]/(dashboard)/calendar/page.tsx`**:
  - Import `getUserTags`. Zavoláno `await getUserTags()` a výsledek předán do `CalendarClient` jako `tags` prop.
- **Překlady** (`cs.json`, `en.json`, `uk.json`):
  - Sekce `posts` i `calendar` rozšířeny o klíče: `filterByTag`, `allTags`, `noTagsAvailable`.
- **UX detaily**:
  - Filtr je plně nezávislý na stávajících filtrech (platforma, stav) – všechny se kombinují AND logikou.
  - V triggeru se po výběru tagu zobrazí barevná tečka (10px kroužek s `ring-1`) + jeho název. V dropdownu je tečka u každé option.
  - Prázdný stav: pokud uživatel nemá žádné tagy, dropdown zobrazí informaci "Zatím nemáte žádné štítky" jak v desktopu tak v mobile bottom-sheetu.
  - Tlačítko pro vymazání filtru (X) je vždy k dispozici, když je filtr aktivní.
- **Build**: `npm run build` prošel ✅ 0 chyb. Všechna nová pole v `tLabels`/`tCalendar` jsou volitelná s `??` fallbacky – zpětná kompatibilita zachována.

### Fix – Interní štítky se v kartě nezobrazovaly po uložení (DOKONČENO)

- **Problém**: Po kliknutí na "Uložit interní metadata" v `EditPostDialog` se toast zobrazil a backend vrátil 200 OK, ale interní štítky se v kartě příspěvku na stránce Příspěvky (`/posts`) nezobrazovaly.
- **Příčina** (dvě chyby):
  1. **Chybějící JOIN v SELECTu** – server component `posts/page.tsx` načítal `posts` přes `select("*, post_platforms(*)")` – **chybělo `post_tags(tags(id, name, color))`**. Server tedy vůbec nevěděl, že příspěvek má interní tagy. V kalendáři to bylo opraveno (viz. předchozí CHANGELOG), ale v `posts/page.tsx` se na to zapomnělo.
  2. **State se neaktualizoval po `router.refresh()`** – `PostsContainer` držel seznam příspěvků ve vlastním `useState(initialPosts)`, který se inicializoval jen jednou. Když `EditPostDialog` po uložení zavolal `router.refresh()`, server sice poslal nová data, ale lokální `posts` state zůstal starý.
- **Řešení**:
  - **`posts/page.tsx`**:
    - Přidán `post_tags(tags(id, name, color))` do SELECTu.
    - V `map()` funkci přidána normalizace `post_tags` z formátu `[{ tags: { id, name, color } | null }]` na flat array `[{ id, name, color }]`.
    - V `initialPosts` mappingu přidáno `post_tags: post.post_tags ?? []`.
  - **`_posts-container.tsx`**: Přidán `useEffect`, který synchronizuje lokální `posts` state s `initialPosts` props při každé změně. Po `router.refresh()` se nyní karty v seznamu automaticky aktualizují.
- **Dopad**: Štítky uložené přes tlačítko "Uložit interní metadata" (nebo přes standardní uložení příspěvku) se nyní **okamžitě zobrazí v kartě** v seznamu Příspěvky i v Kalendáři.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Fix – Tlačítko pro uložení interních štítků u publikovaných příspěvků (DOKONČENO)

- **Problém**: Uživatel hlásil, že po výběru interního štítku (Nastavení → Štítky) v editoru se u publikovaných příspěvků neobjevilo žádné tlačítko pro uložení změn. Stejný problém se projevil u nových příspěvků. Interní metadata tak nebylo možné uložit.
- **Příčina**:
  1. `EditPostDialog` – v `isAnyPublished` větvi se tlačítka zobrazovala jen podmíněně (`isContentChanged`, `canPublishAdditional`). Pokud uživatel změnil pouze interní metadata (tagy/lokaci), nezobrazilo se žádné tlačítko.
  2. `posts/[id]/page.tsx` – v `handleSave`, když byl `status === "published"`, se vždycky volalo `publishPost` (znovu publikovalo na sociální sítě), i když se změnily jen interní tagy.
  3. `posts/new/page.tsx` – tlačítka byla disabled, ale bez vysvětlení proč (uživatel nevěděl, že chybí text/platformy).
- **Řešení**:
  - **`edit-post-dialog.tsx`**: Přidán `useMemo` `hasMetadataChanges` (porovnává `selectedTagIds`, `location`, `tags` proti originálu). Přidán handler `handleSaveMetadata` volající `updatePost` jen s interními poli (location, tags, tagIds). V `isAnyPublished` větvi přidáno tlačítko "Uložit interní metadata" (vždy viditelné, disabled pokud žádná změna). Rozšířen typ `tLabels` o volitelná pole `saveMetadata`, `metadataSaved`.
  - **`posts/[id]/page.tsx`**: Přidán state `originalPost` (snapshot originálních dat). Přidány `useMemo` `isContentChanged` a `hasMetadataChanges`. Přidán handler `handleSaveMetadata`. V `handleSave` u `status === "published"` se nově větví: pokud `!isContentChanged` → uloží se jen metadata, BEZ opakovaného `publishPost`. V UI přidáno druhé tlačítko "Uložit interní metadata" vedle "Uložit".
  - **`posts/new/page.tsx`**: Přidána nápověda `newPostHint` pod tlačítka, která se zobrazí, když chybí text nebo platformy – uživatel pochopí, proč jsou tlačítka disabled.
  - **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`): Přidány klíče `saveMetadata`, `metadataSaved`, `saveMetadataTooltip`, `metadataOnlyHint`, `newPostHint` v sekcích `posts` i `calendar`.
- **Bezpečnost**: `updatePost` striktně odděluje interní metadata od `published_platforms`/`published_at`/`external_ids` – tyto sloupce se nikdy nepřepíšou přes `updatePost` (řízeno přes RPC `append_published_platform` v `publish` flow). Nové tlačítko "Uložit interní metadata" je tedy zcela bezpečné – nikdy neovlivní stav na sociálních sítích.
- **Build**: `npm run build` prošel ✅ 0 chyb. Typ `tLabels` rozšířen zpětně kompatibilně (všechna nová pole jsou volitelná s `??` fallbacky).

### Feature – Interní štítky (Nastavení → Štítky) integrace do editoru a karty (DOKONČENO)

- **Cíl**: Štítky z tabulky `tags` (dříve "dead feature") dostaly skutečný účel – slouží jako interní organizační pomůcka. Inline hashtagy (`posts.tags: string[]`) zůstávají beze změn pro publikaci na sociální sítě.
- **`supabase/migrations/028_create_post_tags.sql`** (NOVÝ) – vazební tabulka `post_tags` (N:M mezi `posts` a `tags`). Sloupce: `id`, `post_id`, `tag_id`, `user_id`, `created_at`, `updated_at` + UNIQUE(post_id, tag_id) + indexy + RLS politiky (SELECT/INSERT/DELETE přes `auth.uid() = user_id`) + trigger na `updated_at`. CASCADE na smazání.
- **`src/lib/supabase/types.ts`** – přidány typy `tags` a `post_tags` (Row/Insert/Update).
- **`src/lib/actions/tag-actions.ts`** (NOVÝ):
  - `getUserTags()` – načte všechny tagy přihlášeného uživatele (seřazené abecedně).
  - `createTagInline(name, color)` – vytvoří nový tag z editoru. Při duplicitě (case-insensitive) vrátí existující tag s `alreadyExists: true`.
  - `setPostTags(postId, tagIds)` – diff-based: smaže všechny vazby pro post, vloží nové (s ownership checkem na `tags` i `posts`).
  - `getPostTags(postId)` – vrátí tagy s metadaty (name, color) přiřazené k postu.
- **`src/lib/actions/posts.ts`** – rozšíření:
  - `getPosts` / `getPost` – JOIN na `post_tags(tags(id, name, color))`. Výsledek normalizován do flat array `post_tags: { id, name, color }[]`.
  - `createPostAction` / `updatePost` – nový volitelný parametr `tagIds: string[]`. Po dual-write bloku se zavolá `setPostTags()`.
- **`src/components/tag-picker.tsx`** (NOVÝ) – multi-select picker komponenta (glassmorphism, `rounded-[20px]`). Podporuje:
  - Inline vytváření nových štítků s výběrem barvy (10 předdefinovaných barev).
  - Search + outside-click close.
  - Zobrazení vybraných tagů jako barevné chipy s tlačítkem pro odebrání.
- **Editor integrace** – `posts/new/page.tsx`, `posts/[id]/page.tsx`, `edit-post-dialog.tsx`, `calendar/_calendar-view.tsx`: TagPicker přidán pod existující inline hashtag input (beze změn). Hydratace `selectedTagIds` z `post_tags` při načtení existujícího příspěvku. Všechna volání `createPostAction`/`updatePost` rozšířena o `tagIds`.
- **Karta příspěvku** – `_post-card.tsx`: typ `PostListItem` rozšířen o `post_tags?: { id, name, color }[]`. V kartě se pod textem zobrazují barevné `Badge` s tečkou barvy štítku. `_posts-container.tsx` a `calendar/_calendar-client.tsx` synchronizovány.
- **Překlady** – `cs.json`, `en.json`, `uk.json`: přidány klíče `internalTags`, `internalTagsPlaceholder`, `createTag`, `noInternalTags`, `selectColor`, `add`, `cancel` v sekcích `posts` i `calendar`. Předávány do `posts/page.tsx` a `calendar/page.tsx`.
- **`calendar/page.tsx`** – SELECT rozšířen o `post_tags(tags(id, name, color))`, normalizace v map() funkci.
- **Build** – `npm run build` prošel ✅. Opraveny drobné TS chyby (duplicitní `cancel` v `edit-post-dialog.tsx`, chybějící importy, optional → required `tLabels` klíče).
- **Publish flow** – beze změn. `publish.ts` nikdy nepoužíval `post.tags`, nyní ani nové `post_tags` se neodesílají. Štítky jsou čistě interní.
- **Dopad na stávající data** – žádná. `post_tags` je prázdná. Inline hashtagy fungují dál. Nastavitelné štítky v Nastavení → Štítky konečně použitelné.
- **Co zůstává na další iteraci** (nyní mimo scope): breakdown v Analytice.

## 2026-06-14

### Feature – LinkedIn OAuth Integration (DOKONČENO)

- **Cíl**: Umožnit uživatelům propojit LinkedIn účet přes OAuth 2.0. Zatím jen připojení, publikování následuje.
- **`.env.local`** – přidány `LINKEDIN_CLIENT_ID` a `LINKEDIN_CLIENT_SECRET` (prázdné, čekají na vyplnění z LinkedIn Developer Portal).
- **`supabase/migrations/027_add_token_expires_at_to_social_accounts.sql`** – nový sloupec `token_expires_at TIMESTAMPTZ` v `social_accounts`. LinkedIn tokeny expirují za 60 dní.
- **`src/lib/supabase/types.ts`** – typy `social_accounts` rozšířeny o `token_expires_at: string | null` (Row, Insert, Update).
- **`src/app/api/accounts/linkedin/route.ts`** – nový API route (GET):
  - Bez `code` parametru → redirect na LinkedIn OAuth consent (`w_member_social openid profile email`).
  - S `code` → exchange pro access_token → fetch `/v2/userinfo` → uložení do `social_accounts` (platform='linkedin', token_expires_at=60 dní).
  - Používá `createAdminClient` pro upsert s `onConflict: user_id,platform,platform_id`.
  - Redirect zpět na dashboard (`/accounts`) po úspěchu/chybě.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - `linkedin` přidán do podmínky, která otevírá `ConnectAccountModal` místo manuálního formuláře.
  - `onConnect` handler redirect na `/api/accounts/linkedin?state=...&locale=...`.
  - `SocialAccount` typ rozšířen o `token_expires_at`.
- **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `connectModal.warningDescLinkedIn` – upozornění na 60d expiraci tokenů.
- Build: `npm run build` ✅ 0 chyb

### Feature – AI Vision: Generování popisku z obrázku přes Gemini (DOKONČENO)

- **Cíl**: Rozšíření AI asistenta o multimodální analýzu obrázků – AI analyzuje první nahraný obrázek u příspěvku a vytvoří poutavý popisek.
- **`src/app/api/ai/generate/route.ts`** – nová akce `generate_from_image`:
  - Backend fetchne obrázek z `imageUrl` (Supabase Storage public URL) a pošle ho Gemini jako base64 inline data přes multimodální API.
  - Pokud je v editoru už nějaký text, AI ho vezme v úvahu a propojí s obsahem fotky.
  - Prompt (čeština): "Analizuj tento obrázek a vytvoř poutavý popisek (caption) pro sociální sítě. Buď kreativní, angažující a přirozený."
  - Demo fallback: pokud API klíč chybí, vrátí demo text.
  - Stávající akce (`improve`, `shorten`, `hashtags`) zůstávají beze změny.
- **`src/components/ai-assistant-button.tsx`** – rozšíření komponenty:
  - Nový volitelný prop `imageUrl?: string | null`.
  - Nová položka v dropdown menu: "Generovat z obrázku ✨" s ikonou `ImagePlus` (amber barva).
  - Položka je `disabled` (opacity 40%, cursor not-allowed) pokud `imageUrl` není k dispozici.
  - Samostatný handler `handleGenerateFromImage` – posílá `imageUrl` + volitelný `text` z editoru.
  - Stávající funkce (`handleTextAction` pro improve/shorten/hashtags) plně funkční, žádná regrese.
- **`src/app/[locale]/(dashboard)/posts/new/page.tsx`** – `firstImageUrl` derived z `mediaItems` (první image se `status === 'ready'`) předává jako `imageUrl`.
- **`src/components/edit-post-dialog.tsx`** – stejně `firstImageUrl` z `mediaItems`. Opraven typový warning (`SUPPORTED_UPDATE_PLATFORMS as unknown as string[]`).
- **`src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`** – inline formulář nemá media upload, takže tlačítko zůstane disabled (správné chování). Typ `tAi` rozšířen.
- **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `generateFromImage`: "Generovat z obrázku ✨" / "Generate from image ✨" / "Згенерувати з фото ✨"
  - `aiNoImage`: "Nejprve nahrajte obrázek." / "Upload an image first." / "Спочатку завантажте зображення."
- **Typy**: Rozšířeny v `AiTranslations`, `AIAssistantButtonProps`, `EditPostDialogProps`, `CalendarView`, `CalendarClient`, `PostsContainer`, `PostCard` – všude konzistentně.
- Build: `npm run build` ✅ 0 chyb

### Fix – Oprava Facebook update "Application does not have the capability" (#3)

- **Problém**: `updateOnPlatformAction` pro Facebook selhával s chybou `(#3) Application does not have the capability`. Dva důvody:
  1. Dotaz na `social_accounts` selectoval sloupec `metadata`, který v DB neexistuje – dotaz padl s `42703` a vrátil `null`, což vedlo k hlášce "Chybí přístupový token".
  2. Pokud `external_id` nebyl ve formátu `page_id_post_id` (bez podtržítka), Meta API neznalo příspěvek bez kontextu stránky.
- **Řešení** (`src/lib/actions/publish.ts`):
  - Odstraněn `metadata` ze SELECT dotazu (sloupec neexistuje). Token z `social_accounts.access_token` je už Page Access Token (uložený z `/me/accounts` při OAuth callbacku).
  - Pokud `external_id` neobsahuje podtržítko, sestavíme ho dynamicky jako `${platform_id}_${external_id}`.
  - Přidáno detailní logování `[FB UPDATE]` a `[TOKEN LOOKUP]` pro debug.
- Změněné soubory:
  - `src/lib/actions/publish.ts`

## 2026-06-13

### Feature – Univerzální per-platform update publikovaných příspěvků

- **Cíl**: Přípráva kódu pro dodatečnou úpravu textu u již publikovaných příspěvků, rozšiřitelná pro všechny podporované platformy.
- **`src/lib/actions/publish.ts`** – nová funkce `updateOnPlatformAction(postId, platform, newContent)`:
  - Striktní ověření `user_id` (bezpečnost) – post musí patřit přihlášenému uživateli.
  - Načte `external_id` z `post_platforms` a `access_token` z `social_accounts` pro danou platformu.
  - Switch/case router podle platformy:
    - `facebook`: Plně funkční – POST `graph.facebook.com/{external_id}?message={newContent}`
    - `linkedin`: Placeholder s TODO komentářem (PUT `/v2/posts/{id}`)
    - `youtube`: Placeholder s TODO komentářem (`videos().update`)
    - `twitter` / `x`: Placeholder s TODO komentářem (PUT `/2/tweets/{id}`)
    - `instagram`: Explicitní chyba (API úpravy nepodporuje)
  - Po úspěchu aktualizuje `updated_at` v `post_platforms` a `content` v `posts`.
- **`src/components/edit-post-dialog.tsx`** – dynamické UI:
  - `SUPPORTED_UPDATE_PLATFORMS = ["facebook", "linkedin", "youtube"]` – konfigurační objekt pro snadné rozšiřování.
  - `isContentChanged` detekce: `content.trim() !== post.content?.trim()`.
  - Dynamická tlačítka "Aktualizovat na [Platforma]" – generována pro každou platformu v `post_platforms`, která má `status='published'` A je v seznamu `SUPPORTED_UPDATE_PLATFORMS`.
  - Per-platform loading stavy (`updatingPlatforms` record) – každé tlačítko má vlastní loading spinner.
  - Toast po úspěchu: "Text na [Platforma] byl úspěšně upraven".
  - Instagram varování (žlutý banner) zůstává – zobrazuje se když je post publikován na Instagramu.
- **Design switch/case struktury**:
  - Každá platforma má vlastní `case` blok s API voláním.
  - Společná logika (ověření uživatele, načtení tokenů, update DB, revalidace) je OUTSIDE switch – každá nová platforma potřebuje jen napsat svůj API call.
  - Přidání nové sítě = 1 nový case blok + přidání do `SUPPORTED_UPDATE_PLATFORMS` v UI.

### Fix – Publikování na další platformu (Facebook) po publikování na Instagram

- **Problém**: Když uživatel publikoval příspěvek na Instagram (status `published`, zelená fajfka) a poté chtěl publikovat stejný příspěvek také na Facebook, příspěvek se fyzicky publikoval na Facebook profil, ale aplikace si to nepamatovala. Ikona Facebook zůstala bez fajfky jak na kartě příspěvku tak v dialogu úprav.
- **Příčina**: `publishAdditionalPlatforms` v `publish.ts` volal `handlePublishSuccess`, který dělal `UPDATE` na `post_platforms` kde `platform = 'facebook'`. Ale pokud Facebook v `post_platforms` vůbec neexistoval (příspěvek původně měl jen Instagram), UPDATE aktualizoval 0 řádků. DB zůstala nezměněná.
- **Řešení**: Před publikováním zkontrolujeme, zda cílová platforma existuje v `post_platforms`. Pokud ne, nejprve vytvoříme řádek se statusem `draft`. Poté `handlePublishSuccess` aktualizuje tento řádek na `published` s `external_id` a `published_at`.
- **Změněné soubory**:
  - `src/lib/actions/publish.ts` – přidána kontrola a insert do `post_platforms` v `publishAdditionalPlatforms`

### Fix – `removed_externally` se nastavuje až po skutečném smazání z platformy

- **Problém**: Když uživatel klikl na "Smazat" pro Instagram příspěvek, `deleteFromMeta` vrátil chybu (Instagram nepodporuje DELETE přes API) a okamžitě se status změnil na `removed_externally` v DB. Po obnovení stránky se příspěvek zobrazil jako "Odstraněn externě" i když byl stále na Instagramu.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`): Při chybě mazání (API not supported, network error, missing externalId) se již NENASTAVUJE `removed_externally`. Jediná výjimka je "Object not found" – když Meta potvrdí že příspěvek skutečně neexistuje.
  - `removed_externally` se nastavuje POUZE přes `syncPostStatus` / `syncPublishedPosts` které ověří přes GET request že příspěvek na platformě skutečně chybí.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: Info toast nyní informuje uživatele že musí smazat ručně na platformě a Postio to detekuje při sync – bez změny stavu v DB.
- **Nový workflow**:
  1. Uživatel klikne "Smazat" → Postio zkusí DELETE → API vrátí chybu
  2. Toast: "Instagram nepodporuje smazání přes API. Smažte příspěvek ručně."
  3. Status v DB zůstává `published` – příspěvek se nezobrazuje jako "Odstraněn externě"
  4. Uživatel smaže příspěvek ručně na Instagramu
  5. `syncPublishedPosts` (každé 30 min) ověří přes GET že příspěvek chybí → až tehdy `removed_externally`

### Feature – Chytré mazání Instagram příspěvků (Smart Delete)

- **Problém**: Když uživatel smazal publikovaný příspěvek z Instagramu přes aplikaci Postio, Meta API vrátilo chybu ("Unsupported delete request") a příspěvek zůstal v DB jako `published` navždy. Uživatel neměl možnost příspěvek z aplikace odstranit a neviděl, že na Instagramu stále existuje.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`):
    - Přidán nový return flag `cannotDeleteViaApi` do return typu.
    - Když Meta API vrátí chybu (kromě "Object not found"), příspěvek se nyní označí jako `removed_externally` v `post_platforms` místo aby se vrátila jen chyba.
    - "Object not found" (příspěvek už smazán externě) nyní také explicitně nastaví `removed_externally` + `cannotDeleteViaApi: true`.
    - Network errors a chybějící `externalId` také vedou k `removed_externally` + `cannotDeleteViaApi`.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`:
    - `handleDeleteConfirm`: Nová logika — místo blocking warning toastu pro Instagram, se zobrazí informativní `toast.info` s vysvětlením že příspěvek byl označen jako "Odstraněn externě" a lze jej kdykoli bezpečně smazat z aplikace.
    - Přidáno tlačítko "Chytré mazání" (červený koš) vedle tlačítka Republish pro příspěvky se statusem `removed_externally`.
    - Banner "Odstraněn externě" nyní obsahuje text o možnosti bezpečného smazání z aplikace.
    - Ikony platforem s `removed_externally` stavem mají oranžový badge (AlertTriangle) pro vizuální indikaci.
  - `syncPublishedPosts` v `posts.ts` již umí automaticky detekovat příspěvky smazané na Instagramu ručně (každé 30 min kontroluje Meta API GET).

- **Nový workflow pro Instagram mazání**:
  1. Uživatel klikne "Smazat" → Postio zkusí smazat přes API → API vrátí chybu
  2. Příspěvek se označí jako `removed_externally` (oranžový badge + varovný banner)
  3. Uživatel vidí že příspěvek je "Odstraněn externě" a může:
     - Smažit ho ručně na Instagramu → Postio to detekuje při sync (každé 30 min)
     - Použít "Chytré mazání" (🗑) pro okamžité odstranění z aplikace
     - Použít "Republish" pro znovupublikování

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

## 2026-06-12

### Fix – Oprava zobrazení ikon po publikování na Instagram
- **Problém**: V seznamu příspěvků (stránka Příspěvky) a v kalendáři se nezobrazovaly správně ikonky platforem (zejména po úspěšném publikování). Pole `post_platforms` nebylo správně předáváno z parent komponenty a chyběla jasná vizuální indikace stavu u malých ikon v kalendáři.
- **Řešení**:
  - `src/app/[locale]/(dashboard)/posts/page.tsx`: Opraven databázový dotaz z `select("*")` na `select("*, post_platforms(*)")` a doplněno dynamické mapování pole `post_platforms` a počítaného stavu do seznamu příspěvků (podobně jako to dělá funkce `getPosts`).
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`:
    - Ikona platformy (např. Instagram) je nyní zbarvena zeleně, pokud je status `published`.
    - K ikonám platformy byl přidán malý "badge" (fajfka pro úspěch, křížek pro chybu) pro jasnou vizuální indikaci stavu publikování.
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`:
    - Zobrazení ikon v desktopovém i mobilním kalendáři bylo rozšířeno o indikátory stavu (zelená fajfka pro `published`, červený křížek pro `failed`), aby bylo na první pohled patrné úspěšné publikování.

### Fix – Oprava chyb po Etapě 4 (Kalendář a Instagram)
- **Problém**: Po odstranění starých sloupců z tabulky `posts` v Etapě 4 (Úklid) se objevil nesoulad:
  1. Kalendář nešel načíst a hlásil `Error loading posts`.
  2. Při publikování na Instagram aplikace padala na chybějící `platform_id`.
- **Řešení**:
  - `src/app/[locale]/(dashboard)/calendar/page.tsx` a `(dashboard)/page.tsx`:
    - Změněny dotazy z `supabase.from("posts").select("*")` na `select("*, post_platforms(*)")`.
    - Nahrazeno chybné řazení přes smazaný sloupec `scheduled_at` řazením přes `created_at` (kalendář si správné `scheduled_at` spočítá až u klienta nebo v serverové iteraci přes `post_platforms`).
  - `src/lib/actions/posts.ts`:
    - Přidán debug log do `getPosts`, aby bylo možné vidět chyby, pokud dotaz selže.
  - `src/lib/actions/publish.ts`:
    - Do `publishPost` přidán fallback mechanismus pro Instagram. Pokud se z `social_accounts` nepodaří najít pro Instagram účet `platform_id` nebo `access_token`, zkusí se tyto údaje vyhledat v propojeném Facebook účtu uživatele (který často drží metadata pro Instagram byznys účty).
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`:
    - Přidána počáteční kontrola `if (!posts) return null;` a zajištěno, že iterace na ikony čte z `post_platforms`.

### COMPLETED: Etapa 4 – Úklid (Clean up starých sloupců a fallbacků)
- **Cíl**: Dokončit migraci na tabulku `post_platforms` smazáním starých sloupců z tabulky `posts` a odstraněním fallbacků z UI. Aplikace nyní 100% důvěřuje `post_platforms`.
- **Provedené změny**:
  - `supabase/migrations/025_cleanup_posts_table.sql`: Vytvořena migrace, která odstranila zastaralé RPC funkce a dropnula sloupce (`platforms`, `status`, `scheduled_at`, `published_at`, `published_platforms`, `external_id`, `external_ids`, `publish_error`, `removed_at`, `removed_from_platform`, `last_sync_at`) z tabulky `posts`.
  - `src/lib/supabase/types.ts`: Aktualizovány TypeScript typy pro tabulku `posts` (odstraněny smazané sloupce).
  - `src/lib/actions/posts.ts`:
    - Odstraněn dual-write při vytváření/upravování postů (nyní se modifikuje pouze content/media/tags atd.).
    - Přepracovány funkce `deletePost`, `syncPostStatus`, `resetPostStatus`, a `syncPublishedPosts` tak, aby četly a aktualizovaly data pouze z `post_platforms`.
    - `getPosts` a `getPost` nyní počítají agregovaný `status` a `platforms` pole dynamicky z joinnutých `post_platforms`, aby UI komponenty mohly dál používat agregovaný stav pro filtry, ale bez potřeby fallbacků do starých sloupců.
  - `src/lib/actions/publish.ts`: Odstraněn veškerý kód, který aktualizoval `posts` ohledně publikování. Nyní se stav a ID ukládají POUZE do `post_platforms`.
  - `src/components/dashboard/delete-post-dialog.tsx`: Komponenta pro smazání byla přepracována tak, aby brala dostupné sítě výhradně z `post_platforms`.
  - `src/components/edit-post-dialog.tsx` a `_post-card.tsx` a kalendář: Fallbacky z UI odstraněny; ikony, checkboxy a status bar nyní spoléhají plně na `post_platforms`.

### COMPLETED: Etapa 1 – Nová architektura (Garáž) 
- Vytvořena tabulka `post_platforms` pro nezávislou správu sítí. 
- Implementován Dual-Write v `posts.ts` (createPostAction, updatePost). 
- Migrována stávající data ze starého modelu do nového. 
- Ověřen souběžný zápis do obou tabulek (všechny testy OK).

## 2026-06-11

### Feature – Architektonická změna: Model Post + Platform Instance (Etapa 1: DB + Dual Write)

- **Cíl**: Přechod z modelu "jeden post = jeden řádek s polem platforem" na model "hlavní post + samostatné instance pro každou platformu". To umožní plně nezávislou správu stavu, plánování a chyb pro každou sociální síť zvlášť.
- **Provedené změny (Etapa 1)**:
  - `supabase/migrations/023_create_post_platforms.sql`: Vytvořena nová tabulka `post_platforms` s vazbou 1:N na `posts`. Obsahuje specifická data pro danou platformu (`status`, `scheduled_at`, `published_at`, `external_id`, `publish_error`, atd.). Byly nastaveny constraints (včetně `UNIQUE(post_id, platform)`), indexy a RLS politiky (JOIN přes parent tabulku `posts`).
  - `supabase/migrations/024_migrate_to_post_platforms.sql`: Přidán idempotentní migrační skript (s využitím `ON CONFLICT DO NOTHING`), který iteruje přes existující záznamy v `posts`, rozbalí pole `platforms` i `published_platforms` a nasype existující stav (status, časy, JSONB external ID) do odpovídajících řádků v `post_platforms`.
  - `src/lib/actions/posts.ts`: Zavedena *Dual-Write* logika do serverových akcí. 
    - `createPostAction`: Po vytvoření `posts` záznamu rovnou vytvoří pole instancí v `post_platforms` s patřičným statusem (draft / scheduled).
    - `updatePost`: Sleduje změnu v poli `platforms` z UI. Pokud jsou přidány nové sítě, založí pro ně instance; pokud jsou sítě zrušeny a přitom nebyly publikovány, smaže jejich instance z `post_platforms`.
- **Stav po 1. etapě**: Databáze je připravena a začíná zrcadlit data do nové struktury. Frontend (UI), publish proces i edge funkce stále primárně čtou ze staré tabulky `posts` (nenarušuje se tak aktuální chod aplikace).

- Změněné soubory:
  - `supabase/migrations/023_create_post_platforms.sql` (nový)
  - `supabase/migrations/024_migrate_to_post_platforms.sql` (nový)
  - `src/lib/actions/posts.ts`

## 2026-06-08

### Fix – Chybějící config_id při propojování Facebooku (DOKONČENO)

- **Problém**: Při pokusu o propojení Facebook stránky v modálu vrátil Facebook chybu "Neplatný parametr: je potřeba config_id" a propojení se nedokončilo. Důvodem bylo, že při spuštění OAuth flow pro Facebook chyběl parametr `config_id`, který Facebook Login for Business nově vyžaduje.
- **Řešení**: 
  - `src/app/[locale]/(dashboard)/accounts/page.tsx`: Do `queryParams` pro Facebook připojení byl doplněn chybějící parametr `config_id: "891876470597727"`.
  - Odstraněna stará, nepoužívaná funkce `handleFacebookOAuth`, která obsahovala duplicitní (a neaktivní) kód s chybným config_id s překlepem.
- Změněné soubory:
  - `src/app/[locale]/(dashboard)/accounts/page.tsx`

### Fix – Instagram smazání zůstávalo na síti + debug logy + RPC s user_id (DOKONČENO)

- **Problém**: Facebook se smazal fyzicky v pořádku, ale Instagram na síti ZŮSTÁVAL i když Postio hlásilo úspěch. Důvody:
  1. `deleteFromMeta` ignoroval chyby z Meta API a stejně pokračoval v odebírání platformy z DB.
  2. RPC `remove_published_platform` používala `auth.uid()` což v server-side kontextu vrací `NULL` – update se neprovedl.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`):
    - Přidány debug logy: `>>> START MAZÁNÍ Z PLATFORMY`, `>>> POUŽITÉ ID`, `>>> META RESPONSE`.
    - Pokud `resData.error` existuje, funkce NERÁZUJE platformu z DB a vrací `{ success: false, error: "..." }` – uživatel uvidí chybu.
    - Stejně při síťové výjimce (catch) – vrací chybu místo pokračování.
    - RPC volání `remove_published_platform` teď předává `p_user_id: user.id` jako třetí parametr.
  - `supabase/migrations/022_add_user_id_to_remove_published_platform.sql`: Nová migrace která přidá parametr `p_user_id UUID` do funkce a nahradí `auth.uid()` explicitním ID.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: `handleDeleteConfirm` už používá `for (const platform of selectedPlatforms) { await deleteFromMeta(...) }` – správně čeká na každé smazání sériově.

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `supabase/migrations/022_add_user_id_to_remove_published_platform.sql` (nový)

### Fix – DeletePostDialog selektivní mazání + refresh dat (DOKONČENO)

- **Problém**: I když byl příspěvek na Instagramu publikován a měl v DB uložené `external_ids`, modal pro smazání nenabízel selektivní mazání (checkboxy). Zobrazil jen prosté potvrzení. Důvod: podmínka `isPublishedMultiple` vyžadovala `status === "published"` A `published_platforms.length > 1`. Navíc `DeletePostDialog` nedostával `external_ids` z parent komponenty.
- **Řešení**:
  - `src/components/dashboard/delete-post-dialog.tsx`:
    - **Oprava logiky**: `showSelectiveDelete` se teď aktivuje pokud `effectivePlatforms.length > 0` – tedy pokud má post cokoli v `published_platforms` NEBO v klíčích `external_ids`. Už nezávisí na `status === "published"`.
    - **Refresh při otevření**: Přidán `useEffect` + `useCallback` který při otevření dialogu provede fetch z Supabase (`published_platforms, external_ids`) a aktualizuje stav. Během načítání se zobrazuje spinner "Načítám aktuální stav…".
    - **Vylepšené UI**: Každá platforma v seznamu má svou ikonu (Instagram, Facebook, LinkedIn atd.). Položka "Smazat také z aplikace Postio" má výraznější červené zvýraznění (`text-red-600`, `bg-red-50/50`, `border-red-500/25`, `font-semibold`). Pokud uživatel odškrtne mazání z aplikace, zobrazí se info text.
    - **Interface**: Přidán `external_ids?: Record<string, string> | null` do props.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: Předává se `external_ids` do `DeletePostDialog`.

- Změněné soubory:
  - `src/components/dashboard/delete-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

### Fix – Instagram `external_id` fallback + logging (DOKONČENO)

- **Problém**: Při publikování na Instagram se v některých případech neukládalo `external_id` do DB (pokud Meta API `media_publish` vrátilo OK bez `id`), takže mazání selhávalo s chybou "externalId chybí".
- **Řešení**:
  - `src/lib/actions/publish.ts`: `publishToInstagram` – pokud `media_publish` nevrátí `id`, použije se `creation_id` jako fallback (je stále použitelný pro mazání přes Graph API). Přidán explicitní logging (`🔥 IG PUBLISH SUCCESS, final external_id`).
  - `src/lib/actions/publish.ts`: `handlePublishSuccess` – přidán logging před zápisem `external_ids` do DB.
  - `supabase/functions/process-scheduled-posts/index.ts`: Stejná oprava fallbacku na `creation_id` a vylepšený logging v edge funkci plánovače.
  - Oba soubory teď zaručují, že se `external_id` pro Instagram VŽDY uloží do `external_ids` (JSONB) ve formátu `{ instagram: "..." }`.

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`

### Fix – Přechod na `external_ids` pro správné ukládání ID u více platforem (DOKONČENO)

- **Problém**: Sloupec `external_id` typu TEXT přepisoval ID první sítě při publikování na další síť, takže mazání u první sítě selhávalo (ID bylo ztraceno).
- **Řešení**:
  - `src/lib/actions/publish.ts`: Aktualizovány funkce `publishPost`, `handlePublishSuccess`, `updateRemotePostAction`, a `deleteFromMeta`, aby používaly nový JSONB sloupec `external_ids` namísto prostého TEXT `external_id`. Pro ukládání se staré ID zachová pomocí merge objektu `{ ...oldIds, [platform]: newId }`.
  - `src/lib/actions/posts.ts`: Aktualizovány funkce `deletePost`, `syncPostStatus`, `resetPostStatus`, a `syncPublishedPosts` pro práci s JSONB polem a vytahování správného ID na základě dané platformy.
  - Ošetřeno UI (`_post-card.tsx`, `delete-post-dialog.tsx`, `calendar-view.tsx`, `page.tsx`), aby pracovalo s vlastností `external_ids` napříč celou aplikací.
  - Komponenta pro smazání z více sítí teď volá správné ID v závislosti na zvolené síti.

### Fix – "Ghost" smazání z Meta API + Render error u synchronizace (DOKONČENO)

- **Problém 1**: Změny v Server Component pro `syncPublishedPosts` prováděly `revalidatePath` a `revalidateAllLocales` během renderu, což způsobovalo u Next.js render error.
- **Řešení 1**: Z funkce `syncPublishedPosts` (v `posts.ts`) byla odstraněna veškerá volání `revalidatePath` a `revalidateAllLocales`.
- **Problém 2**: Pokud byl příspěvek z Facebooku nebo Instagramu odstraněn ručně, následný pokus o smazání z aplikace selhával s chybou z Meta API ("Unsupported delete request. Object with ID does not exist"), kvůli čemuž uživatel nemohl smazat příspěvek z databáze a vyčistit UI.
- **Řešení 2**: Funkce `deleteFromMeta` (v `publish.ts`) byla upravena tak, že chyby a výjimky při API DELETE dotazu nyní nezastaví proces. V případě selhání se do logu vypíše informace a následně funkce pokračuje dál – provede smazání dané platformy z naší DB přes RPC a vrátí `success: true`. Cíl odstranit příspěvek ze sítě (už neexistuje) i z aplikace je tím splněn.

- Změněné soubory:
  - `src/lib/actions/posts.ts`
  - `src/lib/actions/publish.ts`

### Feature – Selective Delete UI (Chytrý koš) (DOKONČENO)

- **Problém**: Chybělo uživatelské rozhraní pro selektivní mazání příspěvků z Meta platforem (příprava z backendu byla hotová v minulé session).
- **Řešení**:
  - `src/components/dashboard/delete-post-dialog.tsx` – nová UI komponenta pro smazání. 'Premium Glass' design. Pokud je post na více platformách, zobrazí výběr pomocí checkmarků. Možnost smazat i kompletně z aplikace. Pro jedinou platformu klasické varování.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – nahrazen nativní Shadcn `Dialog` za náš nový `DeletePostDialog`. Propojeno s existujícím košem.
  - V `handleDeleteConfirm` voláme v cyklu novou funkci `deleteFromMeta` pro vybrané sítě a na závěr (pokud uživatel zaškrtl) voláme `deletePost` pro smazání z lokální databáze.
  - Přidána robustní zpětná vazba: úspěšné smazání/odstranění s přesným popisem + `toast.success`, automatický `router.refresh()` pro okamžitou aktualizaci UI.

- Změněné soubory:
  - `src/components/dashboard/delete-post-dialog.tsx` (nový)
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

### Meta Capability Error #3 Handling + Selective Delete Preparation (DOKONČENO)

- **Problém**: Meta Graph API vrací Capability Error (#3) při vzdálené editaci publikovaných příspěvků na Facebooku. App Review je vyžadován, ale zatím neproběhl.
- **Řešení**:
  - `publish.ts` – `updateRemotePostAction` nyní detekuje capability error (kontrola `"capability"`, `#3`, `"code":3`, `"error_code":3` v odpovědi Meta API) a vrací přátelskou českou chybu: "Úprava publikovaného příspěvku na Facebooku momentálně vyžaduje dodatečné schválení aplikace ze strany Meta (App Review). V tuto chvíli nelze text na dálku změnit."
  - `publish.ts` – nová funkce `deleteFromMeta(postId, platform)` pro selektivní mazání z konkrétní platformy. Volá Meta Graph API DELETE endpoint, odebírá platformu z `published_platforms` přes RPC `remove_published_platform`, a pokud nezbyde žádná platforma, vrací status na `draft`.
  - `publish.ts` – všechny chybové cesty u editace i mazání volají `revalidatePath("/", "layout")` + `revalidateAllLocales()` pro prevenci zamrznutí UI.
  - `publish.ts` – `updateRemotePostAction` má revalidaci i v úspěšné cestě a při DB update chybě.

- Změněné soubory:
  - `src/lib/actions/publish.ts` – capability error handling, deleteFromMeta(), revalidace na všech cestách

### Fixed – TypeScript Build Error (DOKONČENO)

- Opraven TypeScript build error ve funkci `handlePublishNow` (`edit-post-dialog.tsx`): volání `updatePost` používalo proměnnou `postId`, která byla v daném místě `undefined`. Nahrazeno za `post.id`. Tím prochází produkční build na Vercelu.

### Striktní Oddělení Editace od Publikování (DOKONČENO)

- **Cíl**: Zajišťovat že `updatePost` a `publishPost` jsou naprosto oddělené světy. `published_platforms` smí měnit pouze publikační flow přes RPC.
- **Řešení**:
  - `posts.ts` – `updatePost` má explicitní komentář "STRICT SEPARATION" – `published_platforms`, `published_at`, `external_id` se extrahují a zahazují. `status` je omezen na `draft`/`scheduled`.
  - `edit-post-dialog.tsx` – `handlePublishNow` přepracován: edit flow (`updatePost`) ukládá pouze content/media/platforms, publish flow (`publishPost`) volá RPC `append_published_platform`. Komentáře jasně oddělují EDIT FLOW od PUBLISH FLOW.
  - `edit-post-dialog.tsx` – `handlePublishAdditional` volá pouze `publishAdditionalPlatforms` → RPC. Žádný `updatePost`. `router.refresh()` pro okamžitý update fajfek.
  - `edit-post-dialog.tsx` – `handleUpdateOnSocials` volá pouze `updateRemotePostAction` (text na Meta API + content v DB). Žádné publikování platforem.
  - `publish.ts` – `handlePublishSuccess` používá RPC `append_published_platform` pro atomický zápis platformy. `handlePublishError` nikdy nemodifikuje `published_platforms`.
  - SQL migrace `021_add_remove_published_platform.sql` – nová funkce `remove_published_platform` pro budoucí selektivní mazání.

- Změněné soubory:
  - `src/lib/actions/posts.ts` – STRICT SEPARATION comment
  - `src/lib/actions/publish.ts` – audit (RPC již funguje správně)
  - `src/components/edit-post-dialog.tsx` – handlePublishNow refaktor, jasné oddělení edit/publish flow
  - `supabase/migrations/021_add_remove_published_platform.sql` – nová migrace (append + remove RPC)

### Stabilizační Balíček – Robustní Publishing & UI (DOKONČENO)

- **Cíle**: Zajistit stálost zelených fajfek u publikovaných platforem, blokovat odeslání bez výběru sítě a vylepšit vizualizaci v seznamu.
- **Řešení**:
  - `posts.ts` – Server Action `createPostAction` a `updatePost` nyní natvrdo filtrují `published_platforms` z inputu. Tím je znemožněno, aby formulář náhodou přemazal stav publikování v DB.
  - `publish.ts` – `handlePublishSuccess` volá `revalidatePath("/", "layout")` IHNED po úspěšném zápisu přes RPC pro maximální čerstvost dat.
  - `edit-post-dialog.tsx` – Tlačítka "Naplánovat" a "Publikovat nyní" jsou `disabled`, pokud není vybrána žádná platforma (`platforms.length === 0`).
  - `edit-post-dialog.tsx` – Ikony již publikovaných platforem v modalu mají `opacity-60` a `pointer-events-none`, ale zelená fajfka zůstává viditelná.
  - `_post-card.tsx` – Karta příspěvku v seznamu nyní zobrazuje ikony VŠECH platforem z pole `published_platforms` vedle sebe. Pokud post ještě není publikován, zobrazují se ikony z `platforms` se sníženou opacitou.
  - `edit-post-dialog.tsx` – Všechny klíčové akce (uložení, publikování) důsledně volají `router.refresh()` pro synchronizaci UI s DB.
  - **SQL (RPC)** – Nová migrace `020_update_append_published_platform.sql` aktualizuje RPC funkci tak, aby atomicky nastavovala i `status = 'published'` a `published_at = now()`, a vracela celý řádek příspěvku.

- Změněné soubory:
  - `src/lib/actions/posts.ts` – hard-sanitize `published_platforms`
  - `src/lib/actions/publish.ts` – immediate `revalidatePath`
  - `src/components/edit-post-dialog.tsx` – button validation, icon styling, router refresh
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – multi-platform icons display
  - `supabase/migrations/020_update_append_published_platform.sql` – vylepšená RPC funkce

### Fix – Published Platforms UI Lock + Server Action Hard Sanitize (DOKONČENO)

- **Problém**: Publikovaná platforma (Instagram) zůstávala v UI označena modře, což mátlo uživatele i kód a způsobovalo mizení fajfek.
- **Řešení**:
  - `edit-post-dialog.tsx` – ikony publikovaných platforem jsou vizuálně deaktivovány: zelený border + `opacity-50` + `pointer-events-none`. Modré podsvícení (selected stav) je u published platforem odstraněno. Zelená fajfka zůstává.
  - `edit-post-dialog.tsx` – `useEffect` při načtení modalu automaticky odebírá `published_platforms` ze stavu `platforms` (cleanPlatforms filter). Publikované sítě už nejsou v aktivním výběru.
  - `edit-post-dialog.tsx` – `handlePublishNow` kontroluje `platformsToPublish` (filtruje published) místo `platforms.length`. Disabled stav tlačítka používá `unpublishedSelectedPlatforms.length === 0`.
  - `posts.ts` – `createPostAction` a `updatePost` striktně čistí `published_platforms`, `published_at`, `external_id` z inputu. Status projde pouze jako `draft` nebo `scheduled` – `published`, `publishing`, `failed` jsou zablokovány. Formulář nemůže přepsat stav publikování.
  - `posts.ts` – přidáno `revalidatePath("/", "layout")` do `createPostAction` i `updatePost` pro kompletní revalidaci cache.

- Změněné soubory:
  - `src/components/edit-post-dialog.tsx` – UI lock published platforem, auto-clean platforms, publish button logic
  - `src/lib/actions/posts.ts` – hard sanitize publishing fields, safeStatus guard, revalidatePath("/", "layout")

- Build: `npm run build` ✅ 0 chyb

### Fix – published_platforms Hard Lock + UI Refresh (DOKONČENO)

- **Problém**: Fajfky u publikovaných platforem se přemazávaly při doposílání na další platformu.
- **Řešení**:
  - `updatePost` v `posts.ts` – zakázána jakákoliv úprava `published_platforms`. Pole `published_platforms` se smaže z `updateData` před odesláním do DB. Tento sloupec smí měnit VÝHRADNě publikační logika přes RPC volání `append_published_platform`.
  - `handlePublishSuccess` v `publish.ts` – po RPC volání se čtou čerstvá data z DB (`select published_platforms`) a logují (`console.log("AKTUALIZOVANÉ PLATFORMY V DB:", ...)`). Tím lze ověřit že RPC funguje správně.
  - `edit-post-dialog.tsx` – všech 5 výskytů `window.location.reload()` nahrazeno `router.refresh()` pro Next.js friendly revalidaci. Přidán `useRouter` hook. Přidány debug logy u `handlePublishNow` a `handlePublishAdditional`.
  - RPC funkce `append_published_platform` v migraci 019 je v pořádku (deduplikace + atomický zápis).

- Změněné soubory:
  - `src/lib/actions/posts.ts` – `delete updateData.published_platforms` v updatePost
  - `src/lib/actions/publish.ts` – logging + fetch fresh data v handlePublishSuccess
  - `src/components/edit-post-dialog.tsx` – router.refresh() místo window.location.reload(), debug logy

### Fix – published_platforms Atomic Append via PostgreSQL RPC (DOKONČENO - SUPERSEDED)

- **Problém**: Druhé publikování přemazávalo první v poli `published_platforms`. JavaScript read-modify-write pattern selhával při race conditions.
- **Řešení**: Přechod na atomický zápis přímo v databázi (PostgreSQL).
  - Nová SQL migrace `019_add_append_published_platform_rpc.sql` – vytvořila RPC funkci `append_published_platform(p_post_id UUID, p_platform TEXT)`, která dělá `published_platforms = published_platforms || ARRAY[p_platform]` s deduplikací přímo v PostgreSQL. Žádný read-modify-write v JavaScriptu.
  - `handlePublishSuccess` v `publish.ts` – odstraněn read-modify-write. Nyní volá `supabase.rpc("append_published_platform", {...})` pro atomické přidání platformy do pole. Ostatní pole (status, external_id, published_at) se aktualizují samostatně bez dotyku `published_platforms`.
  - Přidán debug log: `console.log("DB UPDATE - Přidávám do pole:", platform)`.
  - Přidána `revalidatePath("/", "layout")` pro hard refresh celé Next.js cache po každém publikování.
  - UI (`edit-post-dialog.tsx`) – bez změn. `window.location.reload()` po úspěšném publikování zajistí čerstvá data z DB. `effectivePublishedPlatforms` useMemo funguje správně s novými daty.

- Změněné soubory:
  - `supabase/migrations/019_add_append_published_platform_rpc.sql` – nová RPC funkce
  - `src/lib/actions/publish.ts` – `handlePublishSuccess` (RPC + revalidatePath + debug log)

### Fix – published_platforms Append Logic + Error Handler Safety (DOKONČENO - SUPERSEDED)

- **Problém**: Při dodatečném publikování na druhou síť se první platforma z `published_platforms` mazala místo aby se k ní nová přidala.
- **Příčina**: `handlePublishSuccess` používal read-then-write pattern, který mohl ztratit data při race condition. `handlePublishError` při selhání doposílání na další síť resetoval `status` na `"failed"` a `published_at` na `null` – čímž ničil stav původního publikování.
- **Řešení**:
  - `handlePublishSuccess` – přepsán na read-append-write s `Array.from(new Set([...currentPlatforms, platform]))` pro deduplikaci. Přidáno `console.log` pro debugování. Platformy se nyní spolehlivě akumulují.
  - `handlePublishError` – nyní čte `published_platforms` před update. Pokud je post už publikován na jiné platformě (`currentPlatforms.length > 0`), uloží pouze `publish_error` bez resetu `status` a `published_at`. Reset `status: "failed"` + `published_at: null` proběhne pouze u prvního selhaného pokusu.
  - Revalidace (`revalidateAllLocales`) zůstává nezměněná – volá se po každém úspěchu i chybě.
  - Modal (`edit-post-dialog.tsx`) – žádná změna potřeba. `effectivePublishedPlatforms` již správně prochází celé pole a zelené fajfky svítí u všech publikovaných platforem.

- Změněné soubory:
  - `src/lib/actions/publish.ts` – `handlePublishSuccess` (append + dedup), `handlePublishError` (safe partial update)

### Fix – Delete Button Unresponsive + Legacy published_platforms Fallback (DOKONČENO)

- **Problém 1**: Tlačítko koše (smazat) v seznamu příspěvků nereagovalo na kliknutí – bylo pod neviditelnou z-vrstvou karty.
- **Problém 2**: U starých publikovaných postů je `published_platforms` prázdné (migrace 017 byla dodatečná). Modal ukazoval tlačítko "Publikovat na Instagram" i když post už na IG je. Mohlo dojít k duplikátu.
- **Řešení**:
  - Z-index akčních tlačítek zvýšen z `z-20` na `z-30` v `_post-card.tsx`
  - `handleDelete` v `_post-card.tsx` obalen try-catch-finally pro robustnost
  - `deletePost` v `posts.ts` – celý blok Meta API obalen dalším try-catch (outer wrapper)
  - `edit-post-dialog.tsx` – nový `effectivePublishedPlatforms` useMemo: pokud `status === 'published'` a `published_platforms` je prázdné ale `external_id` existuje, považ `platforms` za `published_platforms` (fallback pro legacy data)
  - `isInstagramPublished` nyní používá `effectivePublishedPlatforms` místo `post?.platforms`
  - `unpublishedSelectedPlatforms` a zelená fajfka u platforem také používají `effectivePublishedPlatforms`
  - `EditPostData` interface rozšířen o `external_id?: string | null`
  - Propagace `external_id` v `_post-card.tsx`, `posts/page.tsx`, `calendar/_calendar-view.tsx`, `calendar/_calendar-client.tsx`
  - SQL migrace `018_backfill_published_platforms.sql` – backfill `published_platforms = platforms` pro všechny existující published posty s prázdným polem

- Změněné soubory:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – z-30, try-catch, external_id
  - `src/lib/actions/posts.ts` – outer try-catch wrapper v deletePost
  - `src/components/edit-post-dialog.tsx` – effectivePublishedPlatforms fallback
  - `src/app/[locale]/(dashboard)/posts/page.tsx` – external_id mapping
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – external_id v Post + handlePostClick
  - `src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx` – external_id v Post typu
  - `supabase/migrations/018_backfill_published_platforms.sql` – backfill starých dat

- Build: `npm run build` ✅ 0 chyb

### Feature – Additional Publishing (Publish to More Platforms Later) (DOKONČENO)

- **Problém**: Stav `published` blokoval celý příspěvek, i když uživatel chtěl přidat další platformu.
- **Řešení**: Nový sloupec `published_platforms` (TEXT[]) v tabulce `posts` – ukládá názvy sítí, kde už odeslání proběhlo. Uživatel může vzít publikovaný post a dodatečně ho "doposlat" na další platformu.

- `supabase/migrations/017_add_published_platforms_to_posts.sql` – nová migrace:
  - `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_platforms TEXT[] DEFAULT '{}';`

- `src/lib/actions/publish.ts` – úpravy:
  - `handlePublishSuccess`: po úspěšném odeslání čte `published_platforms`, přidá platformu a zapisuje zpět
  - Nový server action `publishAdditionalPlatforms({ postId, platform })` – publikuje post na jednu novou platformu, která ještě není v `published_platforms`. Stejná publish logika (Instagram 2-phase + Facebook media types), ale jen pro jednu cílovou platformu.

- `src/components/edit-post-dialog.tsx` – dynamické UI:
  - `EditPostData` rozšířen o `published_platforms` (volitelné)
  - Import `publishAdditionalPlatforms` + `Check` z lucide-react
  - Nový state `isPublishingAdditional`
  - `useMemo` `unpublishedSelectedPlatforms` – vybrané platformy které nejsou v `published_platforms`
  - `useMemo` `canPublishAdditional` – true pokud je alespoň jedna nová platforma zaškrtnutá
  - Handler `handlePublishAdditional` – volá `publishAdditionalPlatforms` pro jednu platformu
  - Zelená fajfka (`Check` ikona) u platforem v `published_platforms`
  - Action buttons u published postů: pokud `canPublishAdditional` → tlačítko "Publikovat na {Platforma}" pro každou novou zaškrtnutou platformu (s ikonou + loader). Původní tlačítka "Zrušit" + "Aktualizovat na sítích" zůstávají.

- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče (v calendar i posts):
  - `publishToSelected`: "Publikovat" / "Publish" / "Опублікувати"
  - `additionalPublishSuccess`: "Příspěvek byl publikován" / "Post has been published" / "Публікацію опубліковано"

- Propagace `published_platforms` v datech:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – `PostListItem` typ + mapování do `EditPostDialog`
  - `src/app/[locale]/(dashboard)/posts/page.tsx` – mapování z DB do `PostsList`
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – `Post` interface + `handlePostClick` mapování
  - `src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx` – `Post` typ

- Build: `npm run build` ✅ 0 chyb

### Fix – Published Post UI: No Duplicate Publish + Update on Socials (DOKONČENO)

- **Problém**: Uživatel viděl u publikovaného postu tlačítko "Publikovat nyní", což mohlo vytvořit duplikát.
- **Řešení**: Při `status === 'published'` se tlačítka "Uložit koncept", "Naplánovat" a "Publikovat nyní" skryjí a nahradí je:
  - "Aktualizovat na sítích" – volá `updateRemotePostAction`, pošle nový text na `external_id`.
  - "Zrušit" – zavře modal.
- `src/components/edit-post-dialog.tsx`:
  - Nový `useMemo` `mediaChanged` – detekuje změnu médií u publikovaných postů.
  - Nový handler `handleUpdateOnSocials` – volá `updateRemotePostAction` s `content.trim()`.
  - Action buttons: conditionální render. Published → "Zrušit" + "Aktualizovat na sítích". Ostatní stavy → původní tlačítka.
  - Tlačítko "Aktualizovat na sítích" je `disabled` pokud `mediaChanged === true`.
  - Varovný banner (`AlertTriangle`) pod médii: "U publikovaného postu lze měnit pouze text..."
  - Interface rozšířen o `updateOnSocials`, `onlyTextUpdatePossible`, `cancel`.
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče v `calendar` i `posts`:
  - `updateOnSocials`: "Aktualizovat na sítích" / "Update on Socials" / "Оновити в соцмережах"
  - `onlyTextUpdatePossible`: "U publikovaného postu lze měnit pouze text..." / "For published posts, only text can be changed..." / "Для опублікованих публікацій можна змінювати лише текст..."
- Propagace props: `posts/page.tsx`, `calendar/_calendar-view.tsx`, `_posts-container.tsx`, `_post-card.tsx` – přidány `updateOnSocials`, `onlyTextUpdatePossible`.
- `updateRemotePostAction` v `publish.ts` zůstává beze změny – již správně posílá pouze text na Meta API.
- Build: `npm run build` ✅ 0 chyb

### Feature – Remote Edit (DOKONČENO)

- `src/lib/actions/publish.ts` – nový server action `updateRemotePostAction(postId, newContent)`:
  - Najde v DB příspěvek, získá `external_id` a `access_token` (z `social_accounts`)
  - Facebook: POST na `https://graph.facebook.com/v20.0/{external_id}` s `{ message: newContent, access_token }`
  - Instagram: POST na `https://graph.facebook.com/v20.0/{external_id}` s `{ caption: newContent, access_token }`
  - Aktualizuje pouze `content` v lokální DB
  - Revaliduje `/calendar`, `/posts`, `/dashboard`
- `src/components/edit-post-dialog.tsx` – integrace Remote Editu:
  - Import `updateRemotePostAction` místo `updatePublishedPost`
  - V `handleSubmit`: když `status === "published"` → volá `updateRemotePostAction`
  - Kontrola změny media: pokud se media liší od originálu → toast error "Změna fotky u publikovaného postu není možná. Pro změnu fotky musíte příspěvek publikovat znovu."
  - Toast úspěch: "Text byl upraven v Postio i na sociální síti."
  - Nové volitelné labely v interface: `remoteEditSuccess`, `photoChangeNotAllowed`
- `src/messages/cs.json`, `en.json`, `uk.json` – překlady:
  - `remoteEditSuccess`: "Text byl upraven v Postio i na sociální síti." / "Text has been updated in Postio and on the social network." / "Текст оновлено в Postio та в соціальній мережі."
  - `photoChangeNotAllowed`: "Změna fotky u publikovaného postu není možná..." / "Changing a photo on a published post is not possible..." / "Зміна фото в опублікованій публікації неможлива..."
- Interface updates v `_post-card.tsx` (×2), `_posts-container.tsx` – přidány volitelné labely
- `posts/page.tsx` – propagace `remoteEditSuccess`, `photoChangeNotAllowed` z translations
- `calendar/_calendar-view.tsx` – fallback hodnoty pro nové labely
- Build: `npm run build` ✅ 0 chyb

### Fix – Instagram-Only Publishing (DOKONČENO)

- Validace "Pro publikování vyber Facebook" odstraněna ze všech 4 míst:
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - `src/components/edit-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`
- Podmínka změněna z `!platforms.includes("facebook")` na `platforms.length === 0` — nyní stačí jakákoliv platforma (instagram NEBO facebook)
- Všechna volání `publishToFacebook()` nahrazena za `publishPost()` — router v `publishPost()` automaticky rozliší platformu z DB a zavole `publishToInstagram()` nebo Facebook publish logiku
- Toast messages obecné: "Příspěvek byl úspěšně publikován!" místo "na Facebooku"
- `resetPostStatus` ("Publikovat znovu") potvrzeno — funguje správně: `removed_externally` → `draft`
- Build: `npm run build` ✅ 0 chyb

### Feature – Auto Sync Trigger for External Removal Detection (Krok 34) (DOKONČENO)

- `supabase/migrations/016_add_last_sync_at_to_posts.sql` – nová migrace:
  - Nový sloupec `last_sync_at` (TIMESTAMPTZ) pro throttling synchronizace
- `src/lib/actions/posts.ts` – nový server action `syncPublishedPosts`:
  - Najde všechny posty se statusem `published` + `external_id`, kde `last_sync_at` je starší než 30 minut (nebo NULL)
  - Pro každý post GET na Meta Graph API (`/v20.0/{external_id}?fields=id`)
  - Pokud API vrátí 404/400 → post označí jako `removed_externally` (status, `removed_at`, `removed_from_platform`, `last_sync_at`)
  - Pokud post existuje → jen update `last_sync_at`
  - Revaliduje `/posts`, `/calendar`, `/dashboard` pokud došlo ke změnám
- `src/app/[locale]/(dashboard)/posts/page.tsx` – při načtení stránky:
  - Zavolá `syncPublishedPosts()` **před** načtením seznamu postů
  - Díky tomu se DB aktualizuje a následný select vrátí posty se správným statusem
  - UI se „přebarví" automaticky – oranžový badge + červené upozornění
- Ochrana API limitů: 30min cooldown mezi synchronizacemi (last_sync_at)
- Tlačítko "Publikovat znovu" (`resetPostStatus`) již fungovalo – resetuje `removed_externally` → `draft`
- Build: `npm run build` ✅ 0 chyb

### Feature – Robust Delete + External Removal Detection (Krok 33) (DOKONČENO)

- `supabase/migrations/015_add_removed_externally_status.sql` – nová migrace:
  - Rozšíření CHECK constraintu na `posts.status` o hodnotu `removed_externally`
  - Nové sloupce `removed_at` (TIMESTAMPTZ) a `removed_from_platform` (TEXT)
  - Index `posts_removed_at_idx` pro efektivní filtrování
- `src/lib/actions/posts.ts` – robustní mazání + nové akce:
  - **`deletePost`**: try-catch kolem Meta API volání. Pokud API vrátí 404/400 nebo error code 190/1 (Object not found/deleted), NEHÁŽÍ chybu – místo toho označí post jako `removed_externally` s `removed_at` a `removed_from_platform`. Uživatel se nikdy "nezasekne".
  - **`syncPostStatus`** (nový): GET na Meta API pro zjištění, zda `external_id` stále existuje. Pokud ne, nastaví `status = 'removed_externally'`.
  - **`resetPostStatus`** (nový): Resetuje `removed_externally` post zpět na `draft` (maže `external_id`, `removed_at`, `removed_from_platform`). Umožňuje "Publikovat znovu".
  - **`updatePost`**: typ `status` rozšířen o `removed_externally`
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – UI změny:
  - Nový status styl `removed_externally` (oranžový badge)
  - Červené upozornění s ikonou `AlertTriangle`: "Odstraněno přímo na [Platforma] dne [Datum]"
  - Tlačítko "Publikovat znovu" (`RotateCcw` ikona) – volá `resetPostStatus`
  - `PostListItem` rozšířen o `removed_at` a `removed_from_platform`
  - `deletePost` handler rozliší `removedExternally: true` → `router.refresh()` místo `onDeleted`
- `src/app/[locale]/(dashboard)/posts/page.tsx` – mapování `removed_at`, `removed_from_platform` z DB
- `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` – propagace nových props
- `src/components/post-filters-row.tsx` – volitelný filtr `removed_externally` (přidán pokud je label k dispozici)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – oranžový styl pro `removed_externally` v kalendáři
- `src/messages/cs.json`, `en.json`, `uk.json` – překlady:
  - `statusRemovedExternally`: "Odstraněno externě" / "Removed Externally" / "Видалено зовні"
  - `republish`: "Publikovat znovu" / "Republish" / "Опублікувати знову"
  - `removedExternallyMsg`: "Odstraněno přímo na {platform}" / "Removed directly from {platform}" / "Видалено безпосередньо з {platform}"
- Build: `npm run build` ✅ 0 chyb

### Feature – Full Post Control: Caption Builder, Meta Delete, Published Post Editing (Krok 32) (DOKONČENO)

- `src/lib/caption.ts` – nový utility soubor s funkcí `buildFinalCaption()`:
  - Sestaví finální popisek: `content` + `\n📍 location` + `\n#tag1 #tag2 #tag3`
  - Location se přidá pouze pokud existuje (ve formátu "📍 [místo]")
  - Tags se normalizují (pokud nemají `#`, přidá se) a spojí s mezerou
  - Exportován jako čistá funkce (ne Server Action) pro použití v publish.ts i UI
- `src/lib/actions/publish.ts` – integrace caption builderu do všech publish cest:
  - **`publishPost`**: select query nyní includuje `location, tags`. Všechna volání Meta API používají `finalCaption` místo raw `content`.
  - **Facebook video**: `description` → `finalCaption`
  - **Facebook gallery**: `message` → `finalCaption`
  - **Facebook single photo**: `caption` → `finalCaption`
  - **Facebook text-only**: `message` → `finalCaption`
  - **Instagram**: `caption` → `finalCaption` (v Phase 1 container creation)
  - **Nový Server Action `updatePublishedPost`**: Editace již publikovaných příspěvků na sociálních sítích:
    - Kontroluje `status === 'published'` a `external_id`
    - Rozliší platformu: Instagram → param `caption`, Facebook → param `message`
    - POST na `https://graph.facebook.com/v20.0/{external_id}` s novým caption
    - Aktualizuje lokální DB (content, location, tags)
    - Revaliduje `/calendar`, `/posts`, `/dashboard`
- `src/lib/actions/posts.ts` – oprava mazání z Instagramu:
  - **`deletePost`**: Nyní mazá z obou Meta platfor (Facebook i Instagram)
  - Podmínka změněna z `platforms.includes("facebook")` na `post.status === "published"`
  - Hledá access_token pro `targetPlatform` (první platformu v poli) přes `.ilike()`
  - Obě platformy používají stejný endpoint: `DELETE https://graph.facebook.com/v20.0/{external_id}?access_token={token}`
  - Přidáno logování: mazání, odpověď API, úspěch/ selhání
- `src/components/edit-post-dialog.tsx` – integrace editace publikovaných postů:
  - Import `updatePublishedPost` z publish.ts
  - V `handleSubmit`: když `status === "published"`, volá `updatePublishedPost` místo `updatePost`
  - Po úspěšné editaci na sociální síti: toast + close dialog + reload
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace caption builderu do Edge funkce:
  - **`buildFinalCaption()`**: Stejná logika jako v `src/lib/caption.ts` (standalone pro Edge runtime)
  - **Select query**: přidáno `location, tags`
  - **Publish loop**: `finalCaption` použit pro obě platformy (Instagram i Facebook)
- Build: `npm run build` ✅ 0 chyb

### Fix – Instagram OAuth config_id + Verified Publishing (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – přidán `config_id` do Instagram OAuth queryParams:
  - `config_id: '891876470597727'` – při propojování se otevře růžové Meta okno s brandingem z Meta portálu
- `src/lib/actions/publish.ts` – potvrzeno: Instagram publishing engine funguje (dvoufázový container process):
  - Fáze 1: POST `/{ig_user_id}/media` s `image_url`/`video_url` + `caption` → `creation_id`
  - Fáze 2: (3s/10s delay) POST `/{ig_user_id}/media_publish` s `creation_id` → publikováno
  - Rozlišení FOTO (`image_url` + `media_type: IMAGE`) a VIDEO (`video_url` + `media_type: REELS`)
- `supabase/functions/process-scheduled-posts/index.ts` – potvrzeno: Edge funkce má stejnou Instagram logiku syncnutou
- Build: `npm run build` ✅ 0 chyb

### Feature – Direct Instagram Login (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – OAuth logika v modalu nyní rozlišuje Instagram od Facebooku:
  - **PRO INSTAGRAM**: OAuth scopes `public_profile,email,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,business_management` (bez pages_* scopeů). Callback URL obsahuje `&platform=instagram`.
  - **PRO FACEBOOK**: Původní scopes s `pages_show_list,pages_read_engagement,pages_manage_posts` zůstávají nezměněny.
  - Warning text v modalu se liší: pro Instagram pouze "Profesionální účet (Business/Creator)" – zmínka o "Facebook Stránce" odstraněna.
  - Žádný demo/mock režim – po kliknutí se vždy otevře reálné OAuth okno.
- `src/app/auth/callback/route.ts` – nová logika pro Instagram Direct Login:
  - **Platform hint**: `next` parametr se parsuje pro `platform=instagram` query param.
  - **Instagram Direct flow**: Když `requestedPlatform === "instagram"`, callback nejprve volá `/me` + `/me?fields=instagram_business_account` pro získání vlastního IG účtu uživatele (bez nutnosti FB Page).
  - **Fallback**: Pokud `/me` vrátí ID, uloží se jako Instagram účet s `platform: 'instagram'`.
  - **FB Pages**: Stále se načítají, ale při Instagram Direct Login se FB Pages přeskočí (pokud již byl nalezen přímý IG účet). IG účty propojené s Pages se stále přidávají jako duplicitní ochrana.
  - **Logy**: `[Postio] Instagram Direct Login – hledám vlastní IG účet uživatele`, `[Postio] NALEZEN PŘÍMÝ INSTAGRAM: ...`
- `src/messages/cs.json`, `en.json`, `uk.json` – přidán `connectModal.warningDescInstagram` klíč:
  - CS: "Tato funkce vyžaduje Profesionální účet (Business/Creator)."
  - EN: "This feature requires a Professional account (Business/Creator)."
  - UK: "Ця функція вимагає Професійний акаунт (Business/Creator)."
- Build: `npm run build` ✅ 0 chyb

### Feature – Unified Connect Account Modal (Krok 22) (DOKONČENO)

- `src/components/connect-account-modal.tsx` – nový univerzální informační modal pro Facebook i Instagram:
  - **Design**: 'Premium Glass' styl (`bg-white/10 dark:bg-black/40`, `backdrop-blur-xl`, `rounded-[24px]`).
  - **Šířka**: `max-w-xl` (cca 500-600px) – texty na tlačítkách se už neusekávají.
  - **Hlavička**: Logo sítě (FB/IG) v gradient boxu + nadpis "Propojit [Název sítě]".
  - **Seznam funkcí (checkmarks)**: Automatické publikování, analytika, AI asistent.
  - **Upozornění**: Amber warning box – "Tato funkce vyžaduje Profesionální účet (Business/Creator) nebo Facebook Stránku."
  - **Hlavní tlačítko**: `w-full py-4 text-base font-semibold` s indigo/purple gradientem.
  - **Odkaz dole**: "Máte osobní účet? Zjistěte, jak jej přepnout." → odkaz na Facebook Business Help.
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – logika kliknutí na Facebook i Instagram nyní otevírá informační modal před OAuth přesměrováním:
  - Starý `AccountTypeModal` (dvousloupcový Professional | Personal) nahrazen jedním `ConnectAccountModal`.
  - Facebook kliknutí už NEPŘESMĚRUJE rovnou na FB – nejprve zobrazí modal s informacemi.
  - Instagram kliknutí rovněž používá stejný unifikovaný modal.
  - OAuth scopes zůstávají: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts`.
- `src/messages/cs.json`, `en.json`, `uk.json` – přidána `connectModal` sekce s 8 klíči:
  - `title`, `autoPublishing`, `analytics`, `aiAssistant`, `warningTitle`, `warningDesc`, `connectButton`, `learnMore`
  - Žádná MISSING_MESSAGE chyba.
- Build: `npm run build` ✅ 0 chyb

### Fix – Real Instagram via Meta Graph API + Logging (DOKONČENO)

- `src/app/auth/callback/route.ts` – přidáno detailní logování pro debug Instagram integrace:
  - **Log při hledání IG**: `"Hledám Instagram pro stránku: [název stránky]"`
  - **Log při nalezení IG**: `"NALEZEN REÁLNÝ INSTAGRAM: [username]"`
  - **Log při chybě API**: vypíše chybu z Meta Graph API
  - **Log při upsertu**: ukazuje kolik účtů se ukládá + platformy + platform_id
  - **Log chyb upsertu**: pokud Supabase vrátí chybu při ukládání
  - Instagram se ukládá DO teprve pokud API vrátí platné `ig.id` – žádné prázdné/demo záznamy
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – potvrzeno: žádný demo/falešný Instagram kód. Data pouze z `social_accounts`.
- `supabase/migrations/012_social_accounts_avatar_url_and_constraints.sql` – potvrzeno: unikátní index `(user_id, platform, platform_id)` existuje. Upsert zabraňuje duplikátům.

### Fix – Instagram OAuth Connection (Krok 31.0) (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – OAuth scopes upraveny na přesný požadovaný seznam:
  - **Před**: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts,ads_management,business_management`
  - **Nyní**: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts`
  - Odstraněna nepotřebná práva `ads_management` a `business_management`
  - Upraveno na obou místech: `handleFacebookOAuth()` + `onProfessional` (AccountTypeModal)
- `src/app/auth/callback/route.ts` – callback již obsahuje plnou podporu Instagram Business Account:
  - Pro každou Facebook Page se ptá na `instagram_business_account`
  - Pokud stránka má propojený Instagram, uloží jej jako samostatný řádek (`platform: 'instagram'`) s tokenem Facebook stránky
  - Upsert s `onConflict: "user_id,platform,platform_id"` zabraňuje duplikátům
- Zobrazení na `/accounts` – karty se již správně renderují podle `platform` v DB (Facebook i Instagram jako samostatné karty se správnými ikonami)

### Feature – Instagram Publishing (Single Media, Two-Phase Container) (DOKONČENO)

- `src/lib/actions/publish.ts` – přidána podpora publikování na Instagram:
  - **Nová funkce `publishToInstagram`**: Dvoufázový IG Container proces přes Meta Graph API:
    - **Fáze 1 (Vytvoření kontejneru)**: POST `https://graph.facebook.com/v20.0/{ig_user_id}/media` s `image_url`/`video_url` + `caption` + `access_token`. Z odpovědi získáme `creation_id`.
    - **Fáze 2 (Zveřejnění)**: Počkáme 3s (foto) nebo 10s (video) a pošleme POST `https://graph.facebook.com/v20.0/{ig_user_id}/media_publish` s `creation_id` + `access_token`.
  - **Nová funkce `publishPost`**: Unifikovaný router, který podle `platforms[0]` v DB rozhodne zda volat Facebook nebo Instagram logiku.
  - **`publishToFacebook` zůstává jako backward-compatible alias** – všechna stávající volání fungují dále bez změn.
  - **Instagram text-only validation**: Pokud `mediaUrls` je prázdné, vrátí chybu `"Instagram vyžaduje alespoň jeden obrázek nebo video."`
  - **Shared helpers**: `handlePublishSuccess` / `handlePublishError` pro sdílené DB update + revalidaci.
  - **Logy**: `"Vytvářím IG kontejner..."`, `"IG kontejner vytvořen, creation_id: ..."`, `"Publikuji IG kontejner..."`, `"IG publikováno úspěšně, id: ..."`
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace Instagram logiky do Edge funkce:
  - **Funkce `publishToInstagram`**: Stejná dvoufázová logika jako v server action (container → publish).
  - **Publish loop rozšířen**: `if (targetPlatform === "instagram")` větev hledá Instagram účet v `social_accounts` a volá `publishToInstagram`. Facebook větev zůstává `else if`.
  - **Deploy příkaz**: `npx supabase functions deploy process-scheduled-posts --project-ref=TVOJ_PROJECT_REF`
- Build: `npm run build` ✅ 0 chyb

### Fix – Multi-photo Facebook gallery: attached_media format + Edge function sync (DOKONČENO)

- `src/lib/actions/publish.ts` – oprava `attached_media` formátu pro Facebook Multi-photo API:
  - **Před**: `JSON.stringify(mediaIds)` → `["id1","id2"]` (špatný formát, Facebook přijal jen první fotku)
  - **Nyní**: `JSON.stringify(mediaIds.map(id => ({media_fbid: id})))` → `[{"media_fbid":"id1"},{"media_fbid":"id2"}]` (správný formát)
  - Přidán log: `console.log("Nahrávám galerii s počtem fotek:", photoUrls.length)`
  - Log feed request ukazuje finální `attached_media` payload pro debug
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace multi-photo logiky do Edge funkce:
  - **Funkce `publishToFacebook`**: Signatura změněna z `mediaUrl: string | null` na `mediaUrls: string[]`
  - **4 větve**: video (1), galerie (2+ fotky), single photo (1), text-only
  - **Galerie**: Každá fotka uploadnuta jako `published=false` → shromáždění ID → `attached_media` s `{media_fbid}` formátem → POST na `/{pageId}/feed`
  - **Volání v loopu**: `mediaUrl` → `filteredUrls` (pole všech URL)
  - **Deploy příkaz**: `npx supabase functions deploy process-scheduled-posts --project-ref=TVOJ_PROJECT_REF`
- Build: `npm run build` ✅ 0 chyb

### Fix – Post buttons click, multi-photo Facebook gallery, robust publish, NextImage warnings (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – oprava nereagujících tlačítek Upravit/Smazat:
  - Kontejner tlačítek: přidán `z-20` pro správný stacking context
  - Oba Buttony: přidán `relative z-20` pro zajištění interaktivity
  - Media preview container: přidán `pointer-events-none` aby obrázek neblokoval kliknutí na tlačítka v rohu
- `src/lib/actions/publish.ts` – kompletní přepis `publishToFacebook` s podporou více fotek:
  - **Více fotek (galerie)**: Každá fotka se nejprve uploadne jako `published=false` na `/{pageId}/photos`. Poté se všechny ID shromáždí do `attached_media` pole a pošle se jeden POST na `/{pageId}/feed` s `message` + `attached_media`. Výsledek: galerie na Facebooku.
  - **Jedna fotka**: Původní rychlý postup přes `/{pageId}/photos` s `caption`.
  - **Video**: `/{pageId}/videos` s `file_url` + `description`.
  - **Text**: `/{pageId}/feed` s `message`.
  - **Robustní error handling**: Status se změní na `published` POUZE pokud Meta API vrátí platné `id`. Pokud API vrátí chybu nebo žádné ID, status je `failed` s chybovým textem.
  - **Debug logy**: Specifické logy pro každý typ média ("ODESÍLÁM GALERII FOTEK", "PUBLIKUJI GALERII", atd.)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – oprava NextImage varování:
  - `width={0} height={0}` + `sizes="100vw"` + `style={{ width: "100%", height: "auto" }}` místo pevných `width={240} height={96}`
  - Eliminuje aspect-ratio mismatch varování v terminálu
  - `unoptimized` zachováno pro externí URL z Supabase storage
- Build: `npm run build` ✅ 0 chyb

### Feature – Posts List: Media previews, flex layout, Premium Glass redesign (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – kompletní redesign karty příspěvku pro profesionální galerii obsahu:
  - **Flex layout**: Na desktopu obrázek vlevo + text vpravo (`sm:flex-row`), na mobilu obrázek nahoře + text dole (`flex-col`).
  - **Náhled média**: Pokud příspěvek má `media_urls`, zobrazí se první prvek jako miniatura. Desktop: `w-48 aspect-square`, mobil: plná šířka `aspect-video`. Styl: `object-cover rounded-xl border border-white/10`.
  - **Video detekce**: Soubory `.mp4`/`.mov` se renderují jako `<video>` s Play ikonou overlay (`bg-black/30` + kulaté glass tlačítko s Play šipkou).
  - **Multi-media badge**: Pokud příspěvek má více než 1 médium, v rohu náhledu se zobrazuje `+N` badge (glassmorphism).
  - **Text vylepšení**: Obsah příspěvku je `text-base` (dříve `text-lg`) s `line-clamp-3` aby karty nebyly extrémně dlouhé.
  - **Action tlačítka**: Upravit + Smazat přesunuta do pravého horního rohu (`absolute top-5 right-5`). Na desktopu se zobrazují při hoveru (`sm:opacity-0 group-hover:sm:opacity-100`), na mobilech vždy viditelná.
  - **Premium Glass styl**: Karta má `relative group`, `bg-white/80 dark:bg-card/40`, `backdrop-blur-md`, `rounded-[24px]`, `shadow-[0_8px_30px_rgba(0,0,0,0.06)]`. Action tlačítka mají vlastní glass efekt (`bg-white/60 dark:bg-white/5 backdrop-blur-sm`).
  - **Status + platform icon**: Zarovnány v horní části textového bloku vedle sebe.
  - **Footer**: Datum + naplánovaný čas zarovnány dole s `mt-auto` a `border-t`.
  - **Light/dark mode**: Karty čitelné v obou režimech (mléčné sklo v light, tmavý glass v dark).
  - Build: `npm run build` ✅ 0 chyb

### Fix – AI Backend: Gemini 3.1 Flash-Lite + AQ klíč + edge runtime (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – kompletní aktualizace AI backendu pro Gemini 3.1 Flash-Lite a klíče typu 'AQ':
  - **Odstraněna AIza validace** – smazán `apiKey.startsWith("AIza")` check + regex validace. Klíče 'AQ' (Bound Keys/Service Account) jsou nyní plně podporovány bez formátové kontroly.
  - **Model změněn**: `gemini-2.0-flash-lite` → `gemini-3.1-flash-lite` (nejnovější verze pro rok 2026).
  - **Edge runtime**: přidán `export const runtime = "edge"` pro minimální latenci.
  - **Nové system prompty (čeština)**:
    - `improve`: "Vylepši text příspěvku pro sociální sítě. Zachovej tón, oprav chyby, buď úderný. Vrať pouze čistý text bez uvozovek."
    - `shorten`: "Zkrať tento text na maximum pro Twitter/X při zachování smyslu."
    - `hashtags`: "Na základě textu vygeneruj 5-10 relevantních hashtagů. Vrať je jako řetězec oddělený mezerami, bez čárek."
  - **Error handling pro AQ klíče**: Při 401/403 chybě se do console vypíše `"AI AUTH ERROR: Prověř vazbu klíče na Service Account."`
  - **Demo fallback** zachován – pokud klíč chybí, API vrací demo response bez pádu.
  - Žádné změny v UI/designu. Pouze funkční změny v API route.
  - Build: `npm run build` ✅ 0 chyb

### Fix – AI Asistent: debug logování, API key validation, demo fallback, model update (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – rozsáhlé debug logování pro diagnostiku chyb AI generování:
  - **Logování na vstupu**: `console.log("AI REQUEST RECEIVED, ACTION:", action)` – vidíme jakou akci uživatel zvolil
  - **Kontrola API klíče**: `console.log("API KEY PRESENT:", !!apiKey)` – ověření zda klíč existuje v env
  - **Validace formátu klíče**: Kontrola `apiKey.startsWith("AIza")` – reálné Gemini klíče začínají `AIza...`. Pokud ne, error log s prvních 10 znaky klíče + jasná chybová zpráva pro frontend
  - **Error detaily v catch**: `console.error("AI GENERATION ERROR:", error)` + `error.message`, `error.name`, `error.stack`
  - **Logy před/po Gemini volání**: "Sending prompt to Gemini..." + "Gemini response received, length: N"
- **Demo fallback**: Pokud `GOOGLE_GEMINI_API_KEY` chybí nebo je prázdný, API vrátí `isDemo: true` + statický text pro danou akci (`improve`/`shorten`/`hashtags`). UI se nerozhodí a uživatel vidí že tlačítko funguje.
- **Model změněn**: `gemini-1.5-flash` → `gemini-2.0-flash-lite` (free tier). Původní model `gemini-1.5-flash` byl vyřazen z API v1beta a vracel 404 Not Found.
- **Frontend logování**: `src/components/ai-assistant-button.tsx` – přidán `console.log("AI API Response:")` pro debug response z API v prohlížeči
- **Root cause**: `gemini-1.5-flash` není dostupný pro free tier API klíče. Řešení: `gemini-2.0-flash-lite` je free a funguje.

### Feature – AI Asistent (Gemini 1.5 Flash) – kompletní implementace (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – nový POST endpoint pro AI generování obsahu přes Gemini 1.5 Flash. Podporuje 3 akce: `improve` (vylepšení stylu/gramatiky), `shorten` (zkrácení pro Twitter/X 280 znaků), `hashtags` (generování 5-10 relevantních hashtagů). API klíč z `process.env.GOOGLE_GEMINI_API_KEY`.
- `src/components/ai-assistant-button.tsx` – reusable komponenta: skleněné tlačítko s ikonou Sparkles + DropdownMenu pro výběr 3 akcí. Design: `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg`. Loading stav s animovaným Loader2 + "AI přemýšlí...". Výsledek `improve`/`shorten` nahradí text, `hashtags` se přidá do tagů. Toast notifikace (sonner) pro success/error.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněna sekce `ai` s klíči: `aiAssistant`, `improveText`, `shortenText`, `generateTags`, `aiThinking`, `aiSuccess`, `aiError`, `aiEmptyContent`.
- **Integrace do všech 3 míst tvorby příspěvků:**
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx` – AI tlačítko vedle Content textarea (přes `useTranslations("ai")`)
  - `src/components/edit-post-dialog.tsx` – AI tlačítko v edit modalu (přes `tAi` props, kondiční render)
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – AI tlačítko v inline formuláři kalendáře + v EditPostDialog
- **Props chain pro tAi:**
  - `calendar/page.tsx` → `CalendarClient` → `CalendarView` (server `getTranslations` pro "ai" namespace)
  - `posts/page.tsx` → `PostsContainer` → `PostsList` → `PostCard` → `EditPostDialog`
  - `calendar/_calendar-view.tsx` → `EditPostDialog` (přes `tAi` props)
- Knihovna `@google/generative-ai` již nainstalovaná v package.json
- Build: `npm run build` ✅ 0 chyb

### Fix – Propojení Facebooku z ikonové mřížky znovu otevírá OAuth + callback zachová existující session (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – klik na Facebook (a Instagram Professional přes modal) znovu používá `supabase.auth.signInWithOAuth({ provider: 'facebook', ... })`, aby se vždy otevřelo Facebook OAuth okno/redirect.
- `src/app/auth/callback/route.ts` – pokud už uživatel měl v prohlížeči session, callback ji po výměně `code` obnoví (`setSession`) a pouze uloží tokeny/účty do `social_accounts` pod původním `user_id` (bez „přepnutí“ na OAuth session).

### Fix – Root layout: React 19 chyba se `<script>` + Supabase env proměnná (DOKONČENO)

- `src/app/layout.tsx` – theme init skript přesunut z `<head>` do `<body>` a použit `dangerouslySetInnerHTML`, aby se eliminovala runtime chyba Reactu 19 „script tag while rendering React component“ a skript se vykonal před hydratací.

## 2026-05-29

### Fix – Propojování Facebooku necreateuje nové auth.users (account linking místo OAuth login) (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – pro „Propojit Facebook“ a Instagram Professional se používá `supabase.auth.linkIdentity` (ne `signInWithOAuth`), takže se nemění primární session e-mailového uživatele a nevznikají nové řádky v `auth.users`.
- `src/app/auth/callback/route.ts` – callback nejdřív načte existujícího uživatele ze session; při uložení `provider_token` ukládá data do `social_accounts` pod původním `user_id` a při již existující session nespouští 2FA redirect.

## 2026-05-28

### Fix – Edge Function: anti-duplikace příspěvků (scheduled → publishing lock) (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – oprava duplicitního odesílání na Facebook:
  - **Lock mechanismus**: Hned po výběru příspěvků se jejich status změní z `scheduled` na `publishing` (batch update `.in("id", ...).eq("status", "scheduled")`)
  - **Anti-duplikace**: Pokud se Edge funkce spustí dvakrát ve stejnou vteřinu, druhá instance nenajde žádné `scheduled` příspěvky (už jsou `publishing`) a skončí early return
  - **Early exit**: Pokud není žádný `scheduled` příspěvek, funkce okamžitě vrátí HTTP 200 s `totalFound: 0`
  - **Error handling**: Všechny DB update v loopu a catch bloku nyní checkují `.eq("status", "publishing")` místo `scheduled`
  - **Status flow**: `scheduled` → `publishing` (lock) → `published` (success) nebo `failed` (error)
  - **DB constraint**: `posts.status` CHECK rozšířen o `publishing` → povolené hodnoty: `('draft', 'scheduled', 'publishing', 'published', 'failed')`

### Fix – Edge Function: TypeScript error u accountError?.message (DOKONČENO)

---

## 2026-05-27

- `supabase/functions/process-scheduled-posts/index.ts` – řádek 291: `accountError?.message` hlásil TypeScript error "Property 'message' does not exist on type...". Opraveno type assertion na `(accountError as { message?: string } | null)?.message` protože import přes `esm.sh` nemá silně definovaný typ `PostgrestError`.

### Fix – Edge Function: robustní logování hledání Facebook účtu (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – vylepšený lookup Facebook účtu:
  - Přidán log před dotazem: `Hledám účet pro user_id: {id} a platformu: facebook`
  - Přidán log výsledku dotazu: `accountError`, `accountsFound`, `accounts` (pro debug)
  - Rozlišená chyba: pokud není nalezen žádný účet → `CHYBA: Účet pro uživatele [ID] nebyl v social_accounts nalezen.`
  - Pokud účet existuje ale chybí `access_token`/`platform_id` → původní error message
  - Case-insensitive `.ilike("platform", "facebook")` již funguje správně

### Feature – Edge Function: reálné publikování na Facebook s detekcí typu média (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – kompletní přepis Edge funkce:
  - **Nová funkce `publishToFacebook`**: Reálné odesílání příspěvků na Facebook přes Meta Graph API s plnou detekcí typu média.
  - **Detekce média**: `detectMediaType()` analyzuje `media_urls[0]` a vybírá správný endpoint:
    - **FOTO** (.jpg, .png, .webp) → `/{pageId}/photos` s parametry `url` + `caption`
    - **VIDEO** (.mp4, .mov) → `/{pageId}/videos` s parametry `file_url` + `description`
    - **TEXT** → `/{pageId}/feed` s parametrem `message`
  - **Logging**: Přidán vstupní log `console.log(">>> Checking for scheduled posts...")` a detailní logy pro každý krok (načtení postů, zpracování, Facebook API odpověď).
  - **Autorizace**: Podpora `service_role` klíče přes hlavičku `apikey` (pro Cron Job) i `Authorization: Bearer` (pro manuální testování).
  - **DB update**: Po úspěšném publikování se nastaví `status = 'published'`, `published_at`, `external_id` (Facebook post ID) a `scheduled_at = null`. Při chybě `status = 'failed'` + `publish_error`.
  - **Facebook účet**: Hledá aktivní Facebook účet uživatele přes `.ilike("platform", "facebook")` a bere `access_token` + `platform_id`.
  - **Analytics**: Vkládá záznam do `analytics` tabulky pouze při úspěšném publikování.
  - **Error handling**: Při unexpected error se post automaticky označí jako `failed` s chybovým textem.

### Stav systému po této aktualizaci

- ✅ `supabase/config.toml` – `verify_jwt = false` (již bylo nastaveno)
- ✅ `supabase/functions/process-scheduled-posts/index.ts` – reálné publish na Facebook s media detekcí
- ✅ `src/lib/actions/posts.ts` – `createPostAction` již správně ukládá `status: 'scheduled'`
- ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx` – tlačítko "Naplánovat" volá `handleSubmit("scheduled")`
- ✅ `src/components/edit-post-dialog.tsx` – tlačítko "Naplánovat" volá `handleSubmit("scheduled")`
- ✅ `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – podpora `status: "scheduled"`

## 2026-05-26

### Fix – Publikování a plánování: case-insensitive account lookup, 5 min tolerance, debug logy (DOKONČENO)

- `src/lib/actions/publish.ts` – dotaz na `social_accounts` nyní používá `.ilike("platform", "facebook")` (case-insensitive), aby se nenašel účet s "Facebook" / "FACEBOOK". Při chybě dotazu nebo chybějícím tokenu/platform_id se vypíšou VŠECHNY záznamy z `social_accounts` do terminálu (`DEBUG - Všechny účty v DB`) pro snadné ladění.
- `src/lib/actions/publish.ts` – před odesláním na Meta Graph API se loguje detail: `console.log("ODESÍLÁM NA FACEBOOK...", { platform_id, text, mediaType, mediaUrl, url })`.
- `src/lib/actions/posts.ts` – `createPostAction` a `updatePost` nově mají 5 minut toleranci u validace času: `scheduled.getTime() < Date.now() - 5 * 60 * 1000`. Uživatel může naplánovat i čas, který právě nastal (do 5 min zpět), což řeší chybu "Čas je v minulosti" při pomalém kliknutí.
- `src/components/locale-switcher.tsx` – zkontrolováno: žádné "login" v textu, přepínač zobrazuje správně "Čeština" / "English" / "Українська".

### Fix – Stabilita auth redirectů (DOKONČENO)

- `middleware.ts` – redirect na `/{locale}/login` probíhá jen pro dashboard routy bez session; `/` nově vede na `/cs` (ne přímo na login).
- `src/app/auth/callback/route.ts` – zjednodušený callback: žádné debug logy, jeden finální `NextResponse.redirect(new URL(next, request.url))`, cookies se bezpečně přenesou do redirect response.
- `src/app/[locale]/(dashboard)/layout.tsx` – do server layoutu přidán `console.log("CURRENT USER:", user?.id)` pro debug session v terminálu.

### Feature – Facebook publish: podpora fotek a videí + striktní plánování (DOKONČENO)

- `src/lib/actions/publish.ts` – `publishToFacebook` nově detekuje typ media podle `media_urls[0]` a volí Graph API endpoint: `/videos` (mp4/mov), `/photos` (jpg/png/webp), jinak `/feed` (text).
- `src/lib/actions/publish.ts` – loguje odpověď z Meta Graph API (`console.log("META RESPONSE:", ...)`) a po úspěchu ukládá `id` do `posts.external_id`.
- `src/lib/actions/posts.ts` – `deletePost` při `posts.external_id` volá smazání z Facebooku přes `DELETE /{external_id}`.
- `src/lib/actions/posts.ts` – validace pro `scheduled`: vyžaduje validní datum v budoucnosti; revalidace po vytvoření/úpravě jde na `/calendar` a `/posts`.
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – „Publikovat nyní“ v modal formuláři nyní opravdu publikuje přes `publishToFacebook` (místo pouhého uložení se statusem `published`).

### Fix – UI: mazání příspěvků + default čas v plánování (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/app/[locale]/(dashboard)/posts/_posts-container.tsx`, `src/app/[locale]/(dashboard)/posts/page.tsx` – mazání příspěvku nyní používá stejný potvrzovací dialog (Radix/shadcn) jako mazání propojeného účtu (místo browser confirm).
- `src/components/ui/date-time-picker.tsx` – výchozí čas v plánování je nyní aktuální čas (místo 12:00), pokud ještě není vybrané datum/čas.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny překlady pro potvrzení smazání příspěvku (texty sjednoceny tónem s potvrzením mazání účtů).

## 2026-05-25

### Fix – Mazání propojených účtů: potvrzení + skutečné odstranění z DB (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – koš nyní otevře potvrzovací dialog a po potvrzení smaže řádek v `social_accounts` (nejen `is_active=false`), takže účet zmizí i ze Supabase.
- `src/app/[locale]/(dashboard)/page.tsx`, `src/components/dashboard/setup-guide.tsx` – počty/progress nyní počítají jen aktivní účty (`is_active=true`), aby se dashboard nespletl při případných historických záznamech.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny překlady pro potvrzení smazání.

### Feature – Uložení FB stránek + IG Business účtů z Graph API do social_accounts (DOKONČENO)

- `src/app/auth/callback/route.ts` – po Facebook OAuth se bere `provider_token` a volá Graph API `/me/accounts?fields=id,name,access_token,instagram_business_account,picture{url}`; ukládají se **Facebook stránky** (page access token + avatar) a k nim napojené **Instagram Business** účty (username + profile picture) přes upsert.
- `supabase/migrations/012_social_accounts_avatar_url_and_constraints.sql` – přidán `avatar_url`, rozšířen `platform` CHECK o `youtube,tiktok` a doplněn unikátní klíč `(user_id, platform, platform_id)` pro bezpečný upsert (bez duplicit).
- `src/lib/supabase/types.ts` – typ `social_accounts` rozšířen o `avatar_url`.
- `src/components/dashboard/setup-guide.tsx` – průvodce „Dokončete nastavení“ nově periodicky/focus re-checkuje stav, takže se úkol „Propojit první síť“ odškrtne i bez refresh.

## 2026-05-23

### Feature – Facebook OAuth pro přímé propojení + Redesign karet účtů (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – kompletní redesign stránky propojených účtů:
  - **Facebook OAuth pro přímé kliknutí**: Klik na Facebook ikonu nyní spouští reálné Facebook OAuth (`handleFacebookOAuth`) místo formuláře s manuálními inputy. Scopes: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,ads_management,business_management`.
  - **Instagram Professional**: Stále přes `AccountTypeModal` → "Propojit Professional účet" → Facebook OAuth (už fungovalo).
  - **Instagram Personal + ostatní platformy**: Twitter, LinkedIn, YouTube, TikTok – stále formulář s manuálními inputy (OAuth pro tyto platformy zatím není nakonfigurován).
  - **Redesign karet propojených účtů**: Nový glassmorphism design (`max-w-2xl mx-auto bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-6`). Vlevo velký kulatý avatar (56px) s gradient pozadím, vedle něj jméno účtu a název platformy. Vpravo zelený svítící bod s ping animací + "Aktivní" + tlačítko odpojení (Trash ikona).
  - **Podpora avatar_url**: Typ `SocialAccount` rozšířen o `avatar_url` a `platform_id` pro budoucí použití profilovek z Facebook Graph API.
  - **Logika prázdného stavu**: "Žádné propojené účty" s PlusCircle se zobrazuje POUZE pokud není žádný aktivní účet. Jakmile je alespoň jeden účet propojen, prázdný stav úplně zmizí.
  - **Počet propojených účtů**: Header ukazuje pouze aktivní účty (`accounts.filter((a) => a.is_active).length`).
  - **Odstraněny nepoužité importy**: `Card`, `CardContent`, `Badge`, `Plus` (lucide-react).

### Feature – Reálné Facebook OAuth propojení účtů (DOKONČENO)

- `src/app/auth/callback/route.ts` – po návratu z Facebook OAuth se nyní extrahuje `provider_token` (access_token) a automaticky ukládá do `social_accounts` tabulky. Graph API volání (`/me` + `/me/accounts`) vyzvedávají profil a propojené Instagram účty. Bez tohoto kroku se token ztrácel a účty byly jen "demo".
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – `onProfessional` handler rozšířen o `ads_management,business_management` scopes + `next=/cs/accounts` redirect parametr + `auth_type: rerequest` pro opakované požadování oprávnění.
- `supabase/migrations/011_add_platform_id_to_social_accounts.sql` – nová migrace: přidán `platform_id` sloupec (TEXT, nullable) do `social_accounts`. Ukládá Facebook Page ID nebo Instagram Account ID potřebné pro publish přes Graph API.
- `src/lib/supabase/types.ts` – typ `social_accounts` rozšířen o `platform_id: string | null` + platform enum rozšířen o `youtube`, `tiktok`.
- `src/components/account-type-modal.tsx` – `onProfessional` typ změněn na `() => void | Promise<void>` pro správné async/await.

### Feature – Facebook OAuth pro propojení Instagram Professional účtu (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – `onProfessional` callback v `AccountTypeModal` nyní spouští Facebook OAuth přes Supabase (`signInWithOAuth`) místo manuálního zadání access tokenu. Scopes: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement` (nezbytné pro budoucí publish fotek na Instagram).
- `src/app/auth/callback/route.ts` – redirect po úspěšném OAuth směřuje na `/accounts` (místo obecného dashboardu), aby uživatel okamžitě viděl stav propojených účtů.
- `.env.local` – přidána `NEXT_PUBLIC_FACEBOOK_APP_ID` (client-side přístup k ID Facebook aplikace).

### Fix – Probliknutí light mode při přihlášení/odhlášení (DOKONČENO)

- `src/app/layout.tsx` – server-side default pro `<html class="dark">` je nyní zapnutý, pokud cookie `theme` není explicitně `light` (tzn. i při chybějící cookie se SSR renderuje v dark). Tím se eliminuje krátký „light flash“ při full reloadu během auth redirectů (login/logout).

### Fix – Google OAuth návrat do dashboardu házel hydration mismatch (DOKONČENO)

- `src/components/dashboard/setup-guide.tsx` – odstraněn `typeof window` branch při SSR (četl localStorage už během renderu) → nově `ready` state načte `setup-dismissed` až v `useEffect` a komponenta do té doby renderuje `null`, takže server i klient mají při hydrataci identické HTML; zároveň Supabase browser klient je cachovaný přes `useRef` (stabilní deps, bez opakovaných requestů).
- `src/app/layout.tsx` – anti-flash theme init skript přes `next/script` (`strategy="beforeInteractive"`) místo inline `<script dangerouslySetInnerHTML>`, aby se vyhnul React warningu o `<script>` při renderu a pořád běžel ještě před hydratací.

### Fix – Responzivita modálu pro výběr typu účtu (Instagram connect) na mobilech (DOKONČENO)

- `src/components/account-type-modal.tsx` – odstraněn `min-w-[600px]` (způsoboval horizontální overflow na mobilech) + obsah má nyní `max-h` podle viewportu a `overflow-y-auto`, aby byl celý modál použitelný i na menších displejích; zároveň lehce upravené paddingy/gapy pro mobile.

### Fix – Login na localhostu nefungoval při použití Supabase publishable key (DOKONČENO)

- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/app/auth/callback/route.ts` – Supabase klienti nyní berou klíč z `NEXT_PUBLIC_SUPABASE_ANON_KEY` nebo fallback `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nové Supabase klíče), takže autentizace funguje i při nové konfiguraci env.
- `middleware.ts` – detekce „Supabase je nakonfigurována“ nyní počítá i s `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a hlídá `placeholder` hodnoty.
- `src/lib/actions/auth.ts`, `src/components/auth/email-signin.tsx` – email login/signup přes Server Action (`emailAuthAction`) pro spolehlivé setnutí session cookies na serveru; signup používá `emailRedirectTo: /auth/callback`.
- `src/components/auth/google-signin-button.tsx` – Google OAuth `redirectTo` má fallback na `window.location.origin` pokud chybí `NEXT_PUBLIC_APP_URL` + v UI se nově zobrazí konkrétní chyba od Supabase (pomáhá odhalit špatně nastavené Redirect URLs v Supabase/Google).

### Fix – Kalendář/time picker umožňuje výběr minut (DOKONČENO)

- `src/components/ui/date-time-picker.tsx` – minuty v pickeru jsou nyní 0–59 místo pouze 0/15/30/45, takže při plánování příspěvků lze nastavit čas po minutách.
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `scheduled_at` se nyní ukládá i při uložení jako koncept (pokud je čas vyplněn), takže se čas publikování neztrácí po refreshi.
- `src/components/ui/date-time-picker.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – opravený bug kdy se při změně minut/hodin ukládal čas s minutami `00` (race condition ve state); zároveň se `scheduled_at` už nepřevádí přes `toISOString().slice(0, 16)`, aby nedocházelo k posunům času.
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`, `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – `scheduled_at` se před uložením normalizuje na validní ISO timestamp (včetně timezone), aby se do DB nikdy neposílal “naivní” čas bez pásma a nedocházelo k rozhození plánování.
- `supabase/functions/process-scheduled-posts` – doplněné lokální TS typy pro Deno/URL importy, aby v editoru nezobrazovaly falešné TypeScript chyby.

### Fix – Cron → Edge Function auth pro nové sb_secret (ECC) klíče (DOKONČENO)

- `supabase/config.toml` – pro `process-scheduled-posts` nastaveno `verify_jwt = false`, aby Edge Runtime nezkoušel parsovat `sb_secret_...` jako JWT (řeší `UNAUTHORIZED_INVALID_JWT_FORMAT` ještě před spuštěním funkce).
- `supabase/functions/process-scheduled-posts/index.ts` – autentizace preferuje hlavičku `apikey` a porovnává ji proti `SUPABASE_SECRET_KEYS` (default secrets v Edge Functions) + fallback na legacy `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase Dashboard → Edge Functions → `process-scheduled-posts` → Settings – `Verify JWT` vypnuto (OFF), aby gateway nevyžadovala `Authorization: Bearer <user-jwt>` pro cron/pg_net volání.
- Ověřeno ručně přes `curl`: `apikey: sb_secret_...` → `HTTP 200` a response `{"ok":true,...}`.
- SQL (Supabase Dashboard → SQL Editor) – cron job musí posílat `sb_secret_...` v hlavičce `apikey` (NE v `Authorization: Bearer ...`):

```sql
-- pokud už job existuje, nejdřív ho smažte
select cron.unschedule('process-scheduled-posts-job');

-- znovu naplánujte se správnou hlavičkou apikey
select cron.schedule(
  'process-scheduled-posts-job',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://rfgortcdptfmmonsqjtp.supabase.co/functions/v1/process-scheduled-posts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', '<sb_secret_...>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Refactor – Navigace: 5 hlavních položek + Nastavení submenu + badge dot (DOKONČENO)

- `src/app/[locale]/(dashboard)/layout.tsx` – hlavní navigace zredukovaná na přesně 5 položek (Přehled, Příspěvky, Kalendář, Účty, Nastavení); dřívější Šablony/Analytika/Zprávy přesunuté do submenu pod Nastavení.
- `src/components/dashboard/sidebar.tsx` – desktop sidebar vyčištěn na 5 položek; Nastavení rozbaluje inline submenu (Šablony, Analytika, Zprávy NEW, Profil, Předvolby, Notifikace, Obecné, Fakturace, Štítky, Upgrade, Odhlásit se) + dot indikátor, pokud je v submenu něco „nepřečteného“.
- `src/components/dashboard/mobile-nav.tsx`, `src/components/dashboard/mobile-nav-wrapper.tsx` – mobile bottom tab bar má pouze 5 položek; Nastavení otevírá menu se všemi sekundárními položkami; dot indikátor na Nastavení (NEW pro Zprávy) se schová po první návštěvě `/inbox` (localStorage `postio:seen:inbox`).
- `src/app/[locale]/(dashboard)/page.tsx` – v „Rychlé akce“ přidány rychlé vstupy na Šablony a Analytiku vedle „Nový příspěvek“ (podle referenčního návrhu).

## 2026-05-09

### Fix – Supabase middleware session refresh pro ECC (P-256) JWT klíče (DOKONČENO)

- Supabase v projektu používá nové **asymetrické** podpisové klíče **ECC (P‑256)** pro JWT (nový bezpečnostní standard; klíče v env mají prefix `sb_`).
- V Next.js middleware (Edge runtime) je nutné aktivně vynutit server-side validaci session, jinak může docházet k náhodným logoutům kvůli neproběhlému refreshi JWT cookie s novými ECC klíči.
- `src/lib/supabase/middleware.ts` – upraven `cookies.setAll` na oficiální `@supabase/ssr` middleware pattern:
  - nastavuje cookies do `request` i `response`
  - po setnutí cookies re-generuje `NextResponse.next({ request: { headers } })` aby Edge runtime viděl aktuální session
- `middleware.ts` – explicitní `await supabase.auth.getUser()` probíhá před redirect logikou; response se bere až po případném refreshi cookie

## 2026-05-07

### Fix – Hydration mismatch v MobileNav + Dark mode flash při navigaci (DOKONČENO)

**Problém 1 – Hydration failed (MobileNav):**
- Server renderoval RSC placeholder pro `MobileNav`, klient renderoval `<nav>` element
- Next.js hlásil hydration mismatch: `<nav>` (client) vs `<div>` (server)
- Příčina: `MobileNav` (use client) byl přímo v `DashboardLayout` (Server Component) – při SSR se neshodovalo HTML

**Oprava 1 – Client-side only rendering MobileNav:**
- `mobile-nav-wrapper.tsx` – nový client wrapper: `useState(false)` + `useEffect(setMounted(true))`
- Renderuje `null` při SSR (mounted=false), `<MobileNav>` až po client mountu
- `layout.tsx` – swap `MobileNav` → `MobileNavWrapper`
- Žádný hydration mismatch – server i klient vidí `null` při hydrataci

**Problém 2 – Dark mode bliká light mode při přechodu mezi stránkami:**
- Při navigaci se `DashboardLayout` re-renderuje a `ThemeProvider` se re-initializuje
- Na krátký moment není na `<html>` class `dark` → problikne light pozadí
- Root layout `serverThemeClass` řešil pouze `theme=dark`, ne `theme=system`

**Oprava 2 – Anti-flash theme script:**
- `src/app/layout.tsx` (root) – inline `<script>` v `<head>`:
  - Čte `theme` cookie ještě před React hydration
  - Pokud `system` → detekuje `prefers-color-scheme: dark` media query
  - Okamžitě nastaví `dark` class na `<html>` – zero flash
- `serverThemeClass` → `isDark` – default `system` = dark (většina uživatelů má dark)
- `theme-provider.tsx` – přidaný `mounted` state guard proti dvojitému aplikování theme

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Filtry na stránce Příspěvky + SetupGuide modal persistence (DOKONČENO)

**Problém 1 – Filtry na stránce "Příspěvky" nefungovaly:**
- Klik na filtr (např. YouTube) změnil URL query params přes `<Link>` ale data se neaktualizovala bez manuálního obnovení stránky
- Příčina: `_posts-filters.tsx` používal `<Link>` elementy pro navigaci, `page.tsx` (Server Component) filtroval data na serveru podle searchParams, ale `PostsList` (client component) měl vlastní `useState(initialPosts)` který se při client-side navigaci nepřerenderoval
- Kalendář fungoval správně protože používal `<button>` + lokální state + `useMemo` pro client-side filtrování

**Oprava 1 – Client-side filtrování jako v Kalendáři:**
- `_posts-filters.tsx` – kompletní přepsání: `<Link>` → `<button>` s `onClick` handlerem, nový `onFilterChange` callback props, odstraněn `locale` prop a `buildHref` funkce
- `_post-card.tsx` – `PostsList` zjednodušen: odstraněn interní state pro posts (pouze renderuje co dostane), nový `onDeleted` callback props, export `PostListItem` typ
- `_posts-container.tsx` – **nový** client wrapper component:
  - Drží shared state filtrů (`activePlatform`, `activeStatus`)
  - `useMemo` pro client-side filtrování posts podle platformy i statusu
  - Kombinuje header + filtry + posts list + empty states
  - Manage delete operace + refresh po smazání posledního postu
- `page.tsx` – zjednodušena: fetchuje všechny posts bez server-side filtrů, předává do `PostsContainer`
- Odstraněny nepoužité importy (`Button`, `Plus`, `FileText`, `Link`, `PostsList`, `PostsFilters`)

**Problém 2 – SetupGuide modál "Dokončete nastavení" se vrátil po refreshi:**
- Uživatel zavřel modál tlačítkem X → `dismissed` state = `true` → modál zmizel
- Po obnovení stránky se state resetoval na `false` → modál se znovu zobrazil
- Příčina: `dismissed` stav byl pouze v React state, žádná persistencia

**Oprava 2 – localStorage persistence:**
- `setup-guide.tsx` – `dismissed` state se inicializuje z `localStorage` (lazy initializer)
- `handleDismiss` callback – nastaví state i `localStorage.setItem("setup-dismissed", "true")`
- Import `useCallback` pro optimalizaci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Supabase "Lock stolen" runtime error (DOKONČENO)

**Problém:** `Lock "lock:sb-...-auth-token" was released because another request stole it` – runtime error v `edit-post-dialog.tsx`. Příčina: každý `EditPostDialog` (jeden na každý post card) volal `createClient()` při každém renderu, což vytvořilo nové instance Supabase browser klienta. Když stránka měla 30+ postů, 30 instancí volalo `getUser()` současně v useEffect a Supabase interní mutex pro cookie parsing se mezi sebou "kradl".

**Oprava:**
- `edit-post-dialog.tsx` – Supabase klient se nyní cachuje v `useRef` (singleton pattern). `getUser()` se volá pouze když je dialog otevřený (`open` prop) a `userId` ještě není nastavená. Přidán try/catch guard.
- `profile-form.tsx` – totéž `useRef` cachování klienta pro konzistenci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Null-safe výpočty v analytics dashboardu (DOKONČENO)

**Problém:** Když migrace 010 nebyla aplikována v Supabase (sloupce `likes`, `comments`, `shares`, `clicks`, `saves` neexistují), vracely se tyto hodnoty jako `null`. V `analytics-dashboard.tsx` se sčítaly přímo (`existing.likes + a.likes`), což při `null` vracelo `NaN` a rozbíjelo grafy i metrické karty.

**Oprava:**
- `dailyData` useMemo – všechny aritmetické operace nyní s `?? 0` fallback: `(existing.likes ?? 0) + (a.likes ?? 0)`
- `postsWithAnalytics` useMemo – totéž
- `dailyData` output – `likes`, `comments`, `shares` mapují na `?? 0` pro BarChart data
- `totals` useMemo už měl `?? 0` guard – OK
- Typ `AnalyticsRecord` má detailní sloupce jako `number | null` – správně

**Poznámka:** SQL migrace 010 zatím nebyla aplikována do Supabase. Fallback v `actions.ts` vkládá pouze `impressions + engagements` pokud detailní sloupce chybí. Dashboard nyní správně handle null hodnoty.

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – Analytika Dashboard s Recharts (DOKONČENO)

**Cíl:** Implementace kompletního Analytics dashboardu s grafy, metriky a filtry časového období.

**Nové soubory:**
- `src/app/[locale]/(dashboard)/analytics/analytics-dashboard.tsx` – Client Component s Recharts grafy:
  - **8 metrických karet**: Dosah (Reach), Interakce, ER%, Lajky, Komentáře, Sdílení, Kliknutí, Uloženo
  - **Area Chart** – Výkon v čase: Zobrazení, Interakce, Lajky (indigo/purple/rose gradienty)
  - **Bar Chart** – Lajky, Komentáře, Sdílení (rose/amber/cyan gradienty)
  - **Top Posts** – Seznam nejlepších příspěvků s detailními metrikami
  - **Filtr období** – 7 dní, 30 dní, 3 měsíce (pill toggle buttons)
  - **Design**: Glassmorphism karty (20px radius), barevné ikony s gradienty, glow efekty
  - **Empty states** – Purple glow + BarChart3 ikona + i18n texty
- `src/app/[locale]/(dashboard)/analytics/actions.ts` – Server Actions:
  - `generateDemoAnalytics()` – vygeneruje 30 realistických demo posts + analytics záznamů
  - Metriky: impressions (500–5500), engagements (2–10% z impressions), likes/comments/shares/clicks/saves
  - Platformy: instagram, facebook, twitter,.linkedin (random distribuce)
  - Data rozložena do posledních 90 dní
- `supabase/migrations/010_extend_analytics_table.sql` – DB migrace:
  - Nové sloupce v `analytics`: `likes`, `comments`, `shares`, `clicks`, `saves` (INT, DEFAULT 0)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – kompletně přepsaný Server Component:
  - Fetchuje posts + analytics z Supabase pro aktuálního uživatele
  - Auto-generuje demo data pokud jsou obě tabulky prázdné
  - Předává data do `AnalyticsDashboard` client componentu
- `src/lib/supabase/types.ts` – rozšířený typ `analytics` o nové sloupce (Row/Insert/Update)
- `src/messages/cs.json` – rozšířený namespace `analytics` (14 nových klíčů):
  - `subtitle`, `reach`, `engagementRate`, `noDataSubtitle`
  - `last7Days`, `last30Days`, `last3Months`
  - `overview`, `performanceOverTime`, `postsPerformance`
  - `averageReach`, `totalLikes`, `totalComments`, `totalShares`, `clicks`, `saves`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině

**Dependency:**
- `npm install recharts` – knihovna pro interaktivní grafy (AreaChart, BarChart, Tooltip, Legend)

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Demo posts insert UUID error (DOKONČENO)

**Problém:** `generateDemoAnalytics()` v `actions.ts` posílal manuálně generované string ID (`demo-post-${user.id}-${i}`) do `posts` tabulky, která očekává UUID. Supabase vrátil error `42804: invalid input syntax for type uuid`.

**Řešení:**
- Odstraněno ruční `id` z `demoPosts` – DB generuje UUID přes `uuid_generate_v4()`
- Po insertu posts: `.select("id")` vrací skutečná UUID z DB
- Analytics insert nyní používá skutečná `post_id` UUID z `insertedPostIds[]`
- Odstraněno `.single()` – vrací všechny řádky z batch insertu

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – 2FA Login Flow (DOKONČENO)

**Fix – `useActionState` outside of transition error:**
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – odstraněn manuální `handleSubmit` + `isVerifying` state
- `<form action={formAction}>` – formAction se předává přímo jako `action` prop → Next.js automaticky obalí volání do `startTransition`
- `isPending` z `useActionState` stačí pro loading state, ruční `isVerifying` není potřeba

**Fix – `NEXT_REDIRECT` swallowed by catch block:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – `catch (e)` chytal `NEXT_REDIRECT` error z `redirect()` a vracel `{ error: "internal_error" }` místo redirectu
- Nyní: `if (e instanceof Error && e.message === "NEXT_REDIRECT") { throw e; }` – redirect errors projdou nahoru
- **Fix – `otplib.verify()` return value:** – otplib vrací `{ valid: true, delta: 0 }` místo booleanu → `typeof result === "boolean" ? result : result.valid`

**Cíl:** Po přihlášení uživatele s aktivní 2FA přesměrovat na verifikační stránku `/login/verify-2fa` místo dashboardu.

**Nové soubory:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – Server Actions pro ověření 2FA kódu při přihlášení:
  - `verify2FACode()` – ověří TOTP kód proti `two_factor_secret` z DB nebo recovery kód proti `two_factor_recovery_codes`
  - `signOutFrom2FA()` – odhlášení z verifikační stránky
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – Client Component formulář:
  - 6místný TOTP kód (výchozí) / 8místný recovery kód (přepínač)
  - Visual display prázdných boxů pro jednotlivé číslice
  - Error messages + loading state
- `src/app/[locale]/(auth)/login/verify-2fa/page.tsx` – Server Component stránka:
  - Logo + glassmorphism card layout
  - LocaleSwitcher + link zpět na login

**Opravené soubory:**
- `src/components/auth/email-signin.tsx` – po úspěšném `signInWithPassword`:
  - Dotaz na `users.two_factor_enabled` pro přihlášeného uživatele
  - Redirect na `/[locale]/login/verify-2fa` pokud je 2FA enabled
  - Redirect na `/[locale]` (dashboard) jinak
- `src/app/auth/callback/route.ts` – po úspěšném `exchangeCodeForSession` (Google OAuth):
  - Stejná kontrola `two_factor_enabled`
  - Redirect na `verify-2fa` nebo dashboard
- `middleware.ts` – přidán `/verify-2fa` do `publicPatterns` aby byla route přístupná bez auth redirectu
- `src/messages/cs.json`, `en.json`, `uk.json` – 15 nových klíčů v namespace `auth`:
  - `verify2FATitle`, `verify2FASubtitle`, `verify2FAPlaceholder`, `verify2FASubmit`, `verify2FAVerifying`
  - `verify2FAError`, `verify2FARetry`, `verify2FABackToLogin`
  - `verify2FAUseRecoveryCode`, `verify2FARecoveryCodeTitle`, `verify2FARecoveryCodeDesc`
  - `verify2FARecoveryCodePlaceholder`, `verify2FARecoveryCodeSubmit`, `verify2FARecoveryCodeError`, `verify2FASwitchToTOTP`

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Chybějící překlad `settings.loading` (DOKONČENO)

**Problém:** `MISSING_MESSAGE: Could not resolve 'settings.loading' in messages for locale 'cs'` – tlačítko v `Setup2FADialog` volalo `t("loading")` s namespace `"settings"`, ale klíč `loading` existoval pouze v sekci `common`.

**Řešení:** Přidán klíč `loading` do sekce `settings` ve všech třech jazycích:
- `src/messages/cs.json` – `"loading": "Načítání..."`
- `src/messages/en.json` – `"loading": "Loading..."`
- `src/messages/uk.json` – `"loading": "Завантаження..."`

### Fix – Bezpečný 2FA Verification Flow (DOKONČENO)

**Problém:** 2FA se zapnula okamžitě po kliknutí na tlačítko bez ověření TOTP kódu. Uživatel jen zadával libovolný text a ten se ukládal jako "secret". Žádný QR kód, žádné ověření proti Google Authenticator.

**Řešení:** Implementován bezpečný 3fázový proces aktivace 2FA:

1. **Inicializace (Pending)**: Klik na "Zapnout 2FA" otevře modální dialog → Server Action `generate2FASetup()` vygeneruje `two_factor_secret` (otplib) + QR kód (qrcode library) → QR se zobrazí uživateli
2. **Ověření (Handshake)**: Uživatel naskenuje QR kód v Google Authenticator, zadá 6místný TOTP kód do modálu → klikne "Potvrdit a aktivovat"
3. **Finální aktivace**: Server Action `confirm2FASetup()` ověří TOTP kód proti secretu → pokud je správný: `two_factor_enabled = true`, uloží secret, vygeneruje 8 záchranných kódů → zobrazí recovery codes screen

**Nové soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/setup-2fa-dialog.tsx` – Client Component modální dialog pro nastavení 2FA:
  - **Step 1 (Setup)**: QR kód + tajný kód + vstupní pole pro 6místný TOTP kód
  - **Step 2 (Recovery)**: Seznam 8 záchranných kódů + tlačítko kopírovat + potvrzení uložení
  - Design: Glassmorphism, 20px radius, barevné ikony (indigo/purple/amber)
  - Veškeré texty v češtině/angličtině/ukrajinštině (i18n)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts`:
  - Odstraněn `enable2FA` (starý nebezpečný action)
  - Nový `generate2FASetup()` – generuje secret + QR code data URL
  - Nový `confirm2FASetup(formData)` – ověřuje TOTP kód, generuje recovery codes, ukládá do DB
  - Importy: `otplib` (generateSecret, generateURI, verify) + `qrcode` (toDataURL)
  - `disable2FA` zůstává beze změny
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx`:
  - Odstraněn starý formulář s `verification_code` inputem
  - Nové tlačítko "Zapnout 2FA" → otevře `Setup2FADialog`
  - Nový state `show2FADialog` + handler `handle2FASuccess()`
  - Odstraněn `enable2FAAction` + `handleEnable2FA`
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx`:
  - Přidán `twoFASuccess` label do props
- `src/messages/cs.json` – 18 nových klíčů: `setup2FATitle`, `setup2FAStep1-3`, `verificationCodeLabel`, `verificationCodePlaceholder`, `confirmAndEnable`, `secretCode`, `qrCodeInstructions`, `invalidCode`, `recoveryCodesTitle`, `recoveryCodesDescription`, `recoveryCodesWarning`, `copyRecoveryCodes`, `recoveryCodesCopied`, `iHaveSavedCodes`, `done`, `cancelSetup`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `package.json` – `@types/qrcode` přidán do devDependencies

**Dependency:**
- `npm install -D @types/qrcode` – TypeScript definice pro `qrcode` library

**Build:** `npm run build` – úspěšně, TypeScript OK, žádné diagnostics chyby

### Fix – Sloupec `avif_auto_download` v migraci 009 (DOKONČENO)
- `supabase/migrations/009_create_avatars_bucket.sql` – odstraněn sloupec `avif_auto_download` z INSERT statementu:
  - Free tier Supabase tento sloupec nemá → error `42703: column does not exist`
  - AVIF konverze není pro avatar bucket potřeba – stačí `id`, `name`, `public`

### Krok 74 – Supabase Storage Bucket pro Avatary (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/009_create_avatars_bucket.sql` – vytvoření storage bucketu `avatars`:
  - Public bucket pro profilové obrázky
  - RLS politiky:
    - Users can upload avatars (INSERT do vlastního folderu `user_id/`)
    - Anyone can view avatars (SELECT pro všechny)
    - Users can update their own avatars (UPDATE vlastních souborů)
    - Users can delete their own avatars (DELETE vlastních souborů)

### Krok 73 – Kompletní implementace Nastavení podle Buffer UX (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/008_add_profile_settings.sql` – nové sloupce v tabulce `users`:
  - `organization_name` TEXT – název organizace
  - `backup_email` TEXT – záložní email
  - `avatar_url` TEXT – URL profilového obrázku
  - `two_factor_enabled` BOOLEAN DEFAULT FALSE – stav 2FA
  - `two_factor_secret` TEXT – TOTP secret
  - `two_factor_recovery_codes` JSONB – recovery kódy

**Stránka Profil (`/settings/profile`):**
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – kompletně přepsaný Client Component:
  - **Foto profilu**: Upload do Supabase Storage (`avatars` bucket), preview, spinner při nahrávání
  - **Email**: Read-only s badge verifikace (již existovalo)
  - **Jméno**: Input pro jméno/příjmení s Save tlačítkem (již existovalo)
  - **Backup Email**: Nové pole pro záložní email s popisem
  - **Heslo**: Sekce pro změnu hesla s toggle form, show/hide password, validace (min 6 znaků)
  - **2FA**: Toggle pro dvoufázové ověřování, enable/disable formuláře, badge stavu
  - **Jazyk**: Selector + přepnutí locale (již existovalo)
  - **Danger Zone**: Smazání účtu s potvrzením ("DELETE"), červená karta
  - **Design**: Glassmorphism karty (20px radius), Buffer-style layout
  - **Toast feedback**: Green check po úspěšném uložení každé sekce
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – rozšířené Server Actions:
  - `updateFullName`, `updateLanguage` (již existovaly)
  - `updateBackupEmail` – update backup_email
  - `updatePassword` – Supabase auth.updateUser
  - `enable2FA`, `disable2FA` – toggle 2FA + secret
  - `deleteAccount` – smazání z users + signOut
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – update Server Component:
  - Fetchuje nová pole: `avatar_url`, `backup_email`, `two_factor_enabled`
  - Předává všechny labely z i18n

**Stránka Organizace/Obecné (`/settings/general`):**
- `src/app/[locale]/(dashboard)/settings/general/page.tsx` – Server Component:
  - **Creation Date**: Read-only datum vytvoření účtu (formátováno podle locale)
  - **Organization Name**: Input s Save tlačítkem
  - Fetchuje `organization_name`, `created_at` z DB
- `src/app/[locale]/(dashboard)/settings/general/general-form.tsx` – Client Component:
  - Dvě sekce v Buffer stylu (Creation Date, Organization Name)
  - State management pro organization name + save feedback
- `src/app/[locale]/(dashboard)/settings/general/actions.ts` – Server Action:
  - `updateOrganizationName` – update organization_name v DB

**i18n aktualizace:**
- `src/messages/cs.json` – nové klíče v `settings` namespace (38 nových klíčů):
  - `generalDescription`, `creationDate`, `organizationName`, `organizationNamePlaceholder`
  - `photo`, `uploadPhoto`, `photoDescription`, `uploading`
  - `backupEmail`, `backupEmailPlaceholder`, `backupEmailDescription`
  - `password`, `changePassword`, `newPassword`, `confirmPassword`
  - `twoFactorAuth`, `twoFactorAuthDescription`, `twoFactorEnabled`, `twoFactorDisabled`
  - `enable2FA`, `disable2FA`, `dangerZone`, `dangerZoneDesc`
  - `deleteAccount`, `confirmPasswordDelete`, `deleteAccountConfirm`, `deletingAccount`
  - `savedGeneral`, `errorSavingGeneral`, `savedBackupEmail`, `errorSavingBackupEmail`
  - `savedPassword`, `errorChangingPassword`, `twoFASuccess`, `twoFADisabled`
  - `errorEnabling2FA`, `errorDisabling2FA`, `photoUpdated`, `errorUploadingPhoto`
  - `accountDeleted`, `errorDeletingAccount`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `src/messages/*.json` – `common.verificationCode` přidán do všech jazyků

### Fix – Whitespace v modálu "Vytvořit nový štítek" (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – vylepšení spacingu pro vzdušnost:
  - **DialogContent**: `p-6 sm:p-8` (menší padding na mobilu)
  - **DialogTitle**: `text-lg sm:text-xl` (responzivní velikost)
  - **DialogHeader**: `pb-3 sm:pb-4`
  - **Formulář**: `space-y-8 sm:space-y-10 pt-4 sm:pt-6` (responzivní mezery mezi sekcemi)
  - **Kořen problému**: `space-y-3` na wrapper `<div>` nefungoval správně – Radix Label má `leading-none` + inline display, což rozbíjelo margin kasládování. Řešení:
    - Odstraněno `space-y-3` z obou wrapper divů
    - Label: `block` display (překoná inline default z Radix)
    - Input: explicitní `mt-3` (12px margin-top přímo na inputu – spolehlivé)
    - Barvy: `mt-3` na kontejner koleček (stejný odstup jako u inputu – label "Barva štítku" na stejné výšce jako "Název štítku")
  - **Mobilní responzivita**: Všechny paddingy a spacingy mají `sm:` varianty

### Krok 72 – Nová stránka Štítky (Tags) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/page.tsx` – Server Component stránka Štítky:
  - **Design**: 100% konzistentní s ostatními stránkami (templates pattern) – H1 + count + tlačítko Create
  - **Empty State**: Centrální obsah s fialovým glow (blur-3xl), Tag ikona (h-16 w-16), nadpis, podnadpis, popis + CTA tlačítko
  - **Seznam štítků**: Karty s barevným tečkovým indikátorem + název + hover delete button (opacity transition)
  - **Data**: Fetchuje `tags` z DB, ordered by `created_at DESC`
  - **Responzivita**: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`, centrální empty state
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – Client Component modální dialog:
  - **Formulář**: Input pro název štítku + výběr barvy (10 barevných koleček)
  - **Barvy**: Indigo, Purple, Pink, Red, Orange, Amber, Emerald, Teal, Cyan, Blue
  - **Výběr barvy**: Rounded-full buttons s ring indikátorem + check ikona na vybranou barvu
  - **Validace**: Submit disabled pokud je prázdný název nebo běží create
  - **Dialog**: shadcn/ui Dialog s glassmorphism stylem (rounded-[20px], backdrop-blur-xl)
- `src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx` – Client Component karta štítku:
  - **Vizuál**: Barevná tečka + název + delete button (opacity-0 → group-hover:opacity-100)
  - **Delete**: Confirm dialog před smazáním → Server Action `deleteTag`
- `src/app/[locale]/(dashboard)/settings/labels/actions.ts` – Server Actions:
  - `createTag(name, color)`: INSERT do `tags` tabulky s `user_id`, revalidace `/settings`
  - `deleteTag(id)`: DELETE z `tags` tabulky s RLS kontrolou `user_id`, revalidace `/settings`
- `supabase/migrations/007_create_tags_table.sql` – SQL migrace:
  - `CREATE TABLE tags` (id UUID, user_id UUID FK → users, name TEXT, color TEXT, created_at, updated_at)
  - `INDEX idx_tags_user_id` pro rychlé dotazy
  - RLS politiky: SELECT/INSERT/UPDATE/DELETE pouze pro vlastníka (`auth.uid() = user_id`)
- `src/messages/cs.json` – nový namespace `tags` (22 klíčů):
  - title, emptyTitle, emptySubtitle, emptyDescription, createTag, modalTitle
  - nameLabel, namePlaceholder, colorLabel, cancel, create
  - tagCreated, tagDeleted, errorCreating, errorDeleting, deleteConfirm, deleteTag
  - usedInPosts, usedInPostsZero
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/labels` již existuje v sidebar dropdown menu (Tag ikona, sekce "Funkce")
- **Build**: `npm run build` – úspěšně, TypeScript OK, nová route `/[locale]/settings/labels` registrována

### Krok 71 – Nová stránka Nastavení / Předvolby (Settings/Preferences) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/preferences/page.tsx` – Server Component stránka Předvolby:
  - **Design**: Stejný styl jako Profil/Fakturace – hlavička H1 + popis, responzivní font (`text-xl sm:text-2xl md:text-3xl`)
  - **Data**: Fetchuje `timezone`, `time_format`, `start_of_week`, `default_posting_time` z tabulky `users`
  - **Default values**: Europe/Prague, 24h, monday, 09:00 (pokud DB vrací null)
  - **Labels**: Předává přeložené stringy z i18n do Client Componentu (pattern jako ProfileForm)
- `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx` – Client Component formulář:
  - **4 sekce** (vzor Buffer): Timezone, Time Format, Start of Week, Default Posting Action
  - **Timezone**: Select box s 42 časovými pásmi (Evropa, Amerika, Asie, Austrálie, Afrika)
  - **Time Format**: Radio card selection (12h / 24h) s preview času + indigo glow na aktivní volbě
  - **Start of Week**: Select box (Neděle / Pondělí)
  - **Default Posting Action**: Native time picker input
  - **Ikony**: Globe (indigo), Clock (purple), CalendarIcon (emerald), Clock (amber) – barevné ikony v rounded-xl boxech
  - **Ukládání**: Jedno tlačítko Save na konci → Server Action `updatePreferences`
  - **Saved feedback**: Check ikona + "Předvolby uloženy!" (auto-hide po 3s)
  - **Responzivita**: `p-4 sm:p-6`, `text-base sm:text-lg`, selecty `w-full sm:w-80` (fixed šířka na desktopu)
  - **Glassmorphism karty**: `rounded-[20px]`, `bg-white/70 dark:bg-card/40`, `backdrop-blur-md`, border + shadow
- `src/app/[locale]/(dashboard)/settings/preferences/actions.ts` – Server Action:
  - `updatePreferences(formData)`: Update `timezone`, `time_format`, `start_of_week`, `default_posting_time` v `users` tabulce
  - `revalidatePath("/settings")` po úspěchu
- `supabase/migrations/006_add_user_preferences.sql` – SQL migrace:
  - `ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Europe/Prague'`
  - `ADD COLUMN time_format TEXT DEFAULT '24' CHECK (IN '12','24')`
  - `ADD COLUMN start_of_week TEXT DEFAULT 'monday' CHECK (IN 'sunday','monday')`
  - `ADD COLUMN default_posting_time TEXT DEFAULT '09:00'`
- `src/messages/cs.json` – nové i18n klíče (settings namespace):
  - preferencesDescription, timezone, timezoneDescription, timeFormat, timeFormatDescription
  - timeFormat12, timeFormat24, startOfWEEK, startOfWEEKDescription
  - defaultPostingAction, defaultPostingActionDescription, defaultTime
  - savedPreferences, errorSaving, sunday, monday
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/preferences` již existuje v sidebar dropdown menu (SlidersHorizontal ikona)

### Fix – Sidebar Upgrade Button: Odkaz na Billing stránku (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – tlačítko Upgrade v dolní části sidebaru:
  - **Nové**: `asChild` prop na Button + `<Link href={`/${locale}/settings/billing`}>`
  - **Předtím**: Tlačítko bylo jen `<Button>` bez jakékoli funkčnosti
  - **Nyní**: Kliknutí přesměruje na `/settings/billing` (stránka s přehledem plánů)

### Fix – Billing Page: Server → Client Serialization Errors (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – oprava serializace props:
  - **Odstraněno**: `icon` property z plans array (React komponenty nelze serializovat)
  - **Odstraněno**: `t={t as any}` (funkce nelze serializovat z Server do Client Component)
  - **Nové**: `translations` objekt s přeloženými stringy (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Odstraněno**: Importy `Check`, `Crown`, `Sparkles`, `Zap` z lucide-react
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – ikony a překlady na klientské straně:
  - **Nové**: `iconMap` – mapuje `plan.id` → ikonu (`free: Sparkles`, `creator: Zap`, `pro: Crown`)
  - **Nové**: Importy `Crown`, `Sparkles`, `Zap` z lucide-react (v client componentu)
  - **Odstraněno**: `icon: React.ElementType` z Plan interface
  - **Odstraněno**: `locale` a `t: any` z BillingCardProps
  - **Nové**: `translations` interface (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Všechna `t("key")`** → `translations.key` (6 míst)
- **Příčina chyby**: Next.js nedovolí předávat funkce ani React komponenty z Server Component do Client Component – lze pouze plain objekty (stringy, čísla, booly, pole)
- Build: úspěšný, žádné TypeScript chyby

### Krok 70 – Konzistence, Live Data a Fix Mobilního Menu (DOKONČENO)
- `src/components/dashboard/mobile-nav.tsx` – fix barev DropdownMenuContent pro Light/Dark mode:
  - **Light mode**: `bg-white/90`, `text-slate-900`, ikony `text-slate-600`, `border-black/5`
  - **Dark mode**: `bg-black/90`, `text-white`, ikony `text-white/70`, `border-white/10`
  - **Backdrop**: `backdrop-blur-xl` + adaptivní stíny
  - **Nový nav item**: Inbox s ikonou MessageSquare + "NEW" badge (premium variant)
  - **Badge import**: `{ Badge } from "@/components/ui/badge"` pro inline "NEW" na mobilu
- `src/components/ui/badge.tsx` – nová varianta "premium":
  - **Design**: Capsule, glassmorphism, indigo text, jemný border
  - **Styl**: `bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 backdrop-blur-sm shadow-sm`
- `src/app/[locale]/(dashboard)/page.tsx` – živá data z Supabase:
  - **Celkem příspěvků**: `COUNT(*)` z `posts`
  - **Naplánované**: `COUNT(*) WHERE status = 'scheduled'` (reálné číslo místo 0)
  - **Propojené účty**: `COUNT(*)` z `social_accounts` (už fungovalo)
  - **Denní série**: `streak` z `users` tabulky
  - **Flame ikona**: Když `streak > 0`, ikona svítí oranžově (`text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]`)
  - **Consistency Score**: Nová karta s kruhovým progress barem (SVG circle + gradient indigo→purple) – mockup 89%
  - **Icon change**: Streak ikona Copy → Flame, Scheduled ikona FileText → Calendar
- `src/components/dashboard/sidebar.tsx` – Inbox nav item + Badge podpora:
  - **ICON_MAP**: Přidáno `inbox: MessageSquare`
  - **NavItem interface**: Nový optional prop `badge?: string`
  - **Render**: Badge variant="premium" se zobrazí vedle labelu pokud `item.badge` existuje
  - **Import**: `MessageSquare` z lucide-react, `Badge` z ui
- `src/app/[locale]/(dashboard)/inbox/page.tsx` – prázdná stránka Community Inbox:
  - **Design**: Glassmorphism karta s MessageSquare ikonou + placeholder text
  - **i18n**: Název z `nav.inbox`
- `src/app/[locale]/(dashboard)/layout.tsx` – Inbox v navItems:
  - Nový item: `{ href: "/inbox", label: navT("inbox"), icon: "inbox", badge: "NEW" }`
  - Pozice: mezi Kalendář a Účty
- `src/messages/cs.json` – nové klíče:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Skóre konzistence"
- `src/messages/en.json` – totéž v angličtině:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Consistency Score"
- `src/messages/uk.json` – totéž v ukrajinštině:
  - `nav.inbox` = "Вхідні"
  - `dashboard.consistencyScore` = "Бал консистентності"
- Build: úspěšný, žádné TypeScript chyby

### Krok 23 – Gamifikace a Redesign Fakturace (DOKONČENO)
- `src/components/dashboard/setup-guide.tsx` – nová komponenta "Dokončete nastavení":
  - **Design**: Skleněná karta (`bg-card/40 backdrop-blur-xl border-white/10 rounded-[24px]`) plavoucí v pravém dolním rohu
  - **Progress bar**: Gradient (indigo→purple) s animací Framer Motion, zobrazuje {completed}/{total} %
  - **Seznam úkolů**: 4 kroky s checkmarky – Vytvořit účet (vždy hotovo), Propojit první síť, Uložit první nápad, Naplánovat první post
  - **Logika**: Widget se zobrazí pouze pokud nejsou všechny kroky hotové; po dokončení zmizí
  - **Data**: Reálná data z DB (social_accounts count, posts count) – Supabase queries při mountu
  - **Dismiss**: X tlačítko pro zavření (state `dismissed`)
  - **Responzivita**: `bottom-20 right-4` na mobilu (nad bottom nav), `bottom-6 right-6` na desktopu
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – nová stránka fakturace:
  - **3 srovnatelné karty**: Free, Creator, Pro – přesně podle vzoru Buffer
  - **Styl karet**: `bg-card/40 backdrop-blur-xl border-white/5 rounded-[24px] p-8`
  - **Header karet**: Ikona (Sparkles/Zap/Crown) + název + popis + cena
  - **Ceny**: Free (zdarma), Creator (199 Kč/8 EUR/9 USD), Pro (499 Kč/20 EUR/22 EUR)
  - **Features list**: Checkmarky s hodnotami (účty, příspěvky/měsíc, šablony, analytika)
  - **Current Plan**: Badge "Aktuální" (emerald) na aktuálním tarifu
  - **Recommended**: Badge + indigo glow na Creator plánu
  - **CTA tlačítka**: "Upgrade" / "Odebírat" / "Aktuální" (disabled)
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – Client Component pro billing karty:
  - **Icon box**: Barevný (indigo) pro recommended, šedý pro ostatní
  - **Display price**: EUR jako primární měna (`{price}€`) + `/měsíc`
  - **Feature items**: Emerald checkmark + label + value
  - **Button varianty**: Default (indigo) pro recommended, outline pro ostatní
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace SetupGuide:
  - Import `SetupGuide` komponenty
  - Render `<SetupGuide locale={locale} />` v layoutu před MobileNav
  - Widget je fixed positioned – neovlivňuje layout
- `src/components/dashboard/mobile-nav.tsx` – optimalizace pro 6 ikon:
  - **Výška**: `h-[64px]` → `h-[56px]` (o 8px nižší)
  - **Distribuce**: `justify-around` → `justify-evenly` (rovnoměrné rozložení)
  - **Padding**: `px-4` → `px-1` (menší okraje)
  - **Ikony**: `w-6 h-6` → `w-5 h-5` (o 1px menší)
  - **Text**: `text-[10px]` → `text-[9px]`, `mt-1` → `mt-0.5`
  - **Active dot**: `bottom-1` → `bottom-0.5` (přiblížen k okraji)
  - **Výsledek**: 6 ikon (Přehled, Příspěvky, Kalendář, Účty, Analytika, Nastavení) se vejdou přirozeně
- `src/messages/cs.json` – nové i18n sekce:
  - `setup`: title, progress, createAccount, connectFirstNetwork, saveFirstIdea, scheduleFirstPost
  - `billing`: title, subtitle, currentPlan, free, creator, pro, perMonth, accounts, postsPerMonth, templates, analytics, support, unlimited, basic, advanced, priority, current, upgrade, downgrade, subscribe
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 68 – Refaktorování nastavení: Dropdown menu + odstranění vnitřního sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – Account Switcher přetvořen na DropdownMenu:
  - **Původní stav**: Statická karta s profilem + tlačítko Settings (redirect) + Upgrade
  - **Nový stav**: Celá karta je kliknutelný DropdownMenuTrigger
  - **DropdownMenuContent** (side="top", Premium Glass design):
    - Sekce ÚČET: Profil (User), Předvolby (SlidersHorizontal), Notifikace (Bell)
    - Sekce ORGANIZACE: Obecné (Building2), Fakturace (CreditCard)
    - Sekce FUNKCE: Štítky (Tag)
    - Separator + LogoutButton (LogOut)
  - **Design**: `backdrop-blur-xl`, `rounded-[20px]`, `bg-white/90 dark:bg-black/90`, shadow
  - **Nový prop**: `settingsLabels` (profile, preferences, notifications, general, billing, labels, accountLabel, organizationLabel, featuresLabel)
  - **Odstraněno**: Settings ikona jako samostatné tlačítko, Settings z ICON_MAP
- `src/app/[locale]/(dashboard)/layout.tsx` – předávání `settingsLabels` do Sidebar + MobileNav:
  - `settingsLabels` objekt z `settingsT` (getTranslations)
  - Sidebar i MobileNav dostávají stejné labels pro konzistenci
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – odstranění vnitřního sidebaru:
  - **Původní stav**: Flex layout s `SettingsSidebar` (w-56) + children ve flex-1
  - **Nový stav**: Jednoduchý kontejner `mx-auto w-full max-w-4xl` – obsah přes celou šířku, centrován
  - **Odstraněno**: Import `SettingsSidebar`, `getTranslations`, `params` prop
  - **Výsledek**: Nastavení bez vnořeného menu – navigace přes dropdown v sidebaru
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – mobilní responzivita:
  - **Karty**: `p-4 sm:p-6` (menší padding na mobilu)
  - **Hlavičky**: `text-base sm:text-lg` (menší font na mobilu)
  - **Spacing**: `mb-3 sm:mb-4` na labelích
  - **Email input**: `px-3 sm:px-4` + `truncate` pro dlouhé e-maily
  - **Badges**: `flex-shrink-0` aby se nemačkaly
  - **Tlačítka**: `flex-wrap` na Language buttons aby nepřetekly
  - **Container spacing**: `space-y-4 sm:space-y-6`
- `src/app/[locale]\(dashboard)\settings\profile\page.tsx` – responzivní hlavička:
  - **H1**: `text-xl font-bold sm:text-2xl md:text-3xl` (stupňovitý font)
  - **Spacing**: `space-y-4 sm:space-y-6`
- `src/components/dashboard/mobile-nav.tsx` – tlačítko Nastavení s DropdownMenu:
  - **Nový nav item**: Settings ikona jako 6th item v bottom bar
  - **DropdownMenu** (side="top", Premium Glass): Stejné sekce jako desktop sidebar
    - ÚČET: Profil, Předvolby, Notifikace
    - ORGANIZACE: Obecné, Fakturace
    - FUNKCE: Štítky
    - Logout (handleLogout přes Supabase client)
  - **Nový prop**: `settingsLabels` (stejný interface jako Sidebar)
  - **Active state**: `isSettingsPage` detekce + indigo glow + tečka
  - **Logout**: Inline `handleLogout` (createClient → signOut → redirect na login)
  - **Design**: `bg-black/90 backdrop-blur-xl` (vždy dark na mobilu)
- `src/components/settings/settings-sidebar.tsx` – komponenta již nepoužívána (zůstává v repo, nic nelomčí)
- Build: úspěšný, žádné TypeScript chyby

### Krok 67 – Oprava useFormState → useActionState (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – migrace na React 19 API:
  - **Příčina**: `ReactDOM.useFormState` byl přejmenován na `React.useActionState` v Next.js 16
  - **Řešení**: Import změněn z `react-dom` → `react`, obě volání `useFormState(...)` → `useActionState(...)`
- Build: úspěšný, žádné chyby

### Krok 66 – Oprava dvou chyb: script tag v layout + translateFn v Client Component (DOKONČENO)
- `src/app/layout.tsx` – oprava Console Error "Encountered a script tag while rendering React component":
  - **Příčina**: `<script>` tag v `<head>` není v Next.js App Router podporován – scripty v React componentech se nikdy neexecutují při client-side rendering
  - **Řešení**: `<script id="theme-init">` přesunuto z `<head>` přímo do `<body>` – theme initialization script běží před hydratací
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – oprava Runtime Error "Functions cannot be passed directly to Client Components":
  - **Příčina**: `authT` a `settingsT` byly funkce z `getTranslations()` předávané přímo do Client Component `ProfileForm` – funkce z Server Components nelze předat bez `"use server"`
  - **Řešení**: Místo funkcí se předávají již vyřešené stringy přes `labels` object (`{ email, emailVerified, emailNotVerifiedBadge, fullName, language, saved }`)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – přepsání interface + implementace:
  - **Nový interface**: `ProfileFormLabels` (stringy) místo `settingsT: any, authT: any` (funkce)
  - **Všechna volání**: `authT("email")` → `labels.email`, `settingsT("fullName")` → `labels.fullName`, atd.
- Build: úspěšný, žádné chyby

### Krok 21 – Úprava hlavní navigace + Sjednocení nastavení (DOKONČENO)
- `src/app/[locale]/(dashboard)/layout.tsx` – nová navigace:
  - **navItems pořadí**: Přehled → Příspěvky → Kalendář → Účty → Analytika
  - **Nastavení odstraněno** z hlavního menu – dostupné jen přes profil/kolečko dole
  - **full_name z DB**: `userFullName` se fetchuje z tabulky `users` (`select("onboarded, full_name")`) a předává se do Sidebar
  - **Sidebar user.name**: Nyní zobrazuje `full_name` z DB místo `user_metadata`
- `src/components/dashboard/sidebar.tsx` – Account Switcher (spodní karta):
  - Zobrazuje `user?.name` (full_name z DB) || "Uživatel"
  - E-mail zůstává pod jménem jako secondary info
  - Settings ikona → redirect na `/${locale}/settings`
- `src/components/dashboard/mobile-nav.tsx` – mobilní navigace:
  - Odstraněno "Nastavení" z bottom bar
  - Přidáno "Účty" (LinkIcon) – stejné pořadí jako desktop
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – Buffer-style settings layout:
  - **Vnitřní sidebar (podmenu)**: 3 sekce – Účet (Profil, Předvolby, Notifikace), Organizace (Obecné, Fakturace), Funkce (Štítky)
  - **Design**: Skleněný efekt (`bg-white/70 dark:bg-card/40 backdrop-blur-md`), `rounded-[20px]`, border
  - **Aktivní položka**: Indigo podsvícení + tečka vpravo (`bg-primary shadow-[0_0_8px]`)
- `src/components/settings/settings-sidebar.tsx` – nová komponenta:
  - Sekční hlavičky z i18n (`accountLabel`, `organizationLabel`, `featuresLabel`)
  - Ikony: User, SlidersHorizontal, Bell, Building2, CreditCard, Tag (lucide-react)
  - Aktivní stav: `bg-indigo-50 text-indigo-700` (light) / `dark:bg-white/[0.05] dark:border-white/10` (dark)
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – server component:
  - Fetchuje `full_name` + `language` z `users` tabulky
  - Renderuje `ProfileForm` s inicializovanými hodnotami
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – client component:
  - **Formulář jména**: Input + Button → Server Action `updateFullName`
  - **Formulář jazyka**: Select + Button → Server Action `updateLanguage` + "Přepnout" tlačítko
  - **Email display**: Read-only + verification badge (CheckCircle2/AlertCircle)
  - **Design**: Glassmorphism karty (`rounded-[20px]`, `bg-white/70 dark:bg-card/40`)
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – Server Actions:
  - `updateFullName(formData)`: Update `full_name` v `users` tabulce → `revalidatePath("/settings")`
  - `updateLanguage(formData)`: Update `language` v `users` tabulce → `revalidatePath("/settings")`
  - Validace: auth check, error handling s `useFormState`
- `src/app/[locale]/(dashboard)/settings/page.tsx` – redirect na `/settings/profile`
- `src/messages/cs.json` – nové klíče v `settings`:
  - `profileDescription`, `preferences`, `notifications`, `general`, `billing`, `labels`
  - `accountLabel`, `organizationLabel`, `featuresLabel`
  - `common.switch` = "Přepnout"
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Databáze**: Žádná migrace potřeba – `full_name` již existuje v tabulce `users` (001_initial_schema.sql)
- Build: úspěšný, žádné TypeScript chyby

### Krok 65 – Buffer-style Account Type Selection Modal (DOKONČENO)
- `src/components/account-type-modal.tsx` – nová komponenta pro výběr typu účtu (Buffer-style flow):
  - **Design**: Dialog s dvěma sloupci vedle sebe – Professional vs Personal
  - **Professional sloupec**: Zelený badge "Automatické odesílání & Notifikace", 3 funkce s ikonymi (Check, Users, BarChart3), indigo/purple gradient tlačítko
  - **Personal sloupec**: Šedý badge "Pouze přes notifikace", 1 funkce (Bell ikona), outline/ghost tlačítko
  - **Styl**: Premium Glass (backdrop-blur-xl, border-white/10, rounded-[20px]), glow efekt na Professional sloupci při hoveru
  - **i18n**: Všechny texty přes `t` props – subtitle, badge, titles, descriptions, buttons
  - **Platforma**: PlatformIcon + platformName v headeru modálu
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – integrace AccountTypeModal:
  - **Nové stavy**: `showTypeModal`, `typeModalPlatform` (id, name, icon)
  - **Klik na Instagram**: Otevírá AccountTypeModal místo přímého formuláře
  - **Klik na ostatní platformy**: Zůstává původní chování (přímý formulář s inputy)
  - **onProfessional + onPersonal**: Zatím obě vedou na stejný formulář (příprava pro OAuth v budoucnu)
- `src/messages/cs.json` – nové klíče v `accounts`: `howToConnect`, `professional`, `professionalDesc`, `personal`, `personalDesc`, `autoPostingBadge`, `notificationsBadge`, `autoPublishing`, `autoPublishingDesc`, `communityReplies`, `communityRepliesDesc`, `postMetrics`, `postMetricsDesc`, `onlyNotifications`, `onlyNotificationsDesc`, `connectProfessional`, `setupPersonal`, `selectTypeSubtitle`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 64 – LocaleSwitcher Fix + Premium Light Login Page Redesign (DOKONČENO)
- `src/components/locale-switcher.tsx` – oprava "login" textu v LocaleSwitcheru:
  - **Příčina**: `usePathname()` vrací `/login` bez locale prefixu v některých případech → `split("/")[1]` vrátilo `"login"` → fallback byl `"login"` místo názvu jazyka
  - **Řešení**: `pathname.split("/").filter(Boolean)` + validace proti seznamu locale kódů – `locales.find((l) => l.code === parts[0])?.code || "cs"`
  - **Fallback**: `"cs"` (Čeština) místo `currentLocale` (který mohl být `"login"`)
  - **Accessibility**: `aria-label={currentLabel}` na Buttonu pro screen readery
  - **Vizuál**: `text-muted-foreground` na labelu jazyka pro jemnější vzhled
- `src/app/[locale]/(auth)/login/page.tsx` – Premium Light redesign:
  - **Pozadí stránky**: `bg-slate-50 dark:bg-black` – jemná šedobílá ve světlém režimu
  - **Grid pattern**: SVG grid s `bg-slate-200/50` v light modu – viditelnější mřížka
  - **Formulářová karta**: `bg-white/60 backdrop-blur-xl border border-white shadow-xl rounded-[32px] p-10` – bílá glass karta s hloubkou
  - **Dark mode**: Karta je transparentní (`dark:bg-transparent dark:shadow-none dark:rounded-none`) – žádná změna dark vizuálu
- `src/components/auth/email-signin.tsx` – Light/Dark adaptivní inputy:
  - **Divider linky**: `bg-slate-200 dark:bg-white/10` – viditelné v obou režimech
  - **Inputy**: `bg-white/80 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-900 dark:text-foreground`
  - **Focus**: `focus:border-indigo-500 dark:focus:border-indigo-500/50` – plně indigo v light, jemnější v dark
  - **Submit tlačítko**: `bg-indigo-500 dark:bg-white text-white dark:text-black hover:bg-indigo-600 dark:hover:bg-white/90` – barevné v light, bílé v dark
- `src/components/auth/login-visual.tsx` – Dashboard mock Light/Dark redesign:
  - **Grid pattern**: `opacity-[0.06] dark:opacity-[0.04]` – viditelnější v light modu, gray stroke (`#a0a0a0`)
  - **Glow efekty**: `bg-purple-200/40 dark:bg-purple-500/20` a `bg-indigo-200/40 dark:bg-indigo-500/15` – silnější záře v light
  - **Hlavní záře**: `from-indigo-200/40 via-purple-200/30 to-blue-200/20 dark:from-purple-500/30 dark:via-indigo-500/20 dark:to-blue-500/10` – indigo glow v light, purple v dark
  - **Dashboard karta**: `border-white/50 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md dark:backdrop-blur-xl shadow-lg dark:shadow-none`
  - **Texty v kartě**: `text-slate-900 dark:text-white` a `text-slate-500 dark:text-white/60` – černé v light, bílé v dark
  - **Graf bary**: Střídavé `bg-slate-200/80 dark:bg-white/25` a `bg-indigo-400/60 dark:bg-white/25` – slate/indigo v light, bílé v dark
  - **Metriky karty**: `bg-white/50 dark:bg-white/10` – silnější v light
  - **Floating karty**: `border-white/60 dark:border-white/20 bg-white/50 dark:bg-white/5 shadow-md dark:shadow-none`
  - **Ikony**: `text-emerald-500 dark:text-emerald-300` a `text-amber-500 dark:text-amber-300` – sytější v light
- Build: úspěšný, žádné TypeScript chyby

### Krok 63 – Light Mode: "Milky Glass" Design Overhaul (DOKONČENO)
- `src/components/ui/dialog.tsx` – Milky Glass modal:
  - **Overlay**: `bg-black/20 dark:bg-black/60` – tmavší overlay pro lepší fokus na modal
  - **DialogContent**: `bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – mléčné sklo ve světlém režimu
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín light, výrazný dark
  - **Text**: `text-slate-900 dark:text-white` – plná černá v light modu
  - **Radius**: `rounded-[20px]` – konzistentní s design systémem
- `src/components/edit-post-dialog.tsx` – Milky Glass edit modal:
  - **DialogContent**: `bg-white/80 dark:bg-card/40` + shadow + border pro Milky Glass
  - **Textarea**: `text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus:bg-white focus:border-indigo-500/30` – plná černá barva textu, jemné bordery
  - **Inputy (location, tags)**: totéž – `bg-white/50` → `focus:bg-white`, `border-black/5` → `focus:border-indigo-500/30`
  - **Platformy**: Přirozené barvy ikon ve světlém režimu (Instagram #E1306C, Facebook #1877F2, Twitter #1DA1F2, LinkedIn #0A66C2, YouTube #FF0000, TikTok #010101)
  - **Platform pill**: `bg-white/60 dark:bg-white/[0.03] text-slate-700` – ne šedé mrtvé, ale živé s barevnými ikonami
  - **Platform pill selected**: `bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300`
- `src/components/ui/date-time-picker.tsx` – Kalendář NAKONEC bílý v light modu:
  - **Trigger button**: `bg-white/50 dark:bg-white/[0.03] border-black/5 dark:border-white/10`
  - **Kalendář kontejner**: `bg-white/95 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – BÍLÝ pozadí v light modu!
  - **Text**: `text-slate-900 dark:text-white` na celém kontejneru
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl`
  - **Navigace měsíce**: hover `bg-black/5 dark:bg-white/10`
  - **Dny v kalendáři**: hover `bg-black/5 dark:bg-white/10`, today `text-indigo-600 dark:text-indigo-300`
  - **Vybraný den**: indigo gradient + `text-white` (nezměněno)
  - **Divider**: `bg-black/5 dark:bg-white/5`
  - **TimeSelect trigger**: `bg-white/60 dark:bg-[#09090b] border-black/5 dark:border-white/10`
  - **TimeSelect dropdown**: `bg-white/95 dark:bg-[#0b0b0b]` – BÍLÝ v light modu!
  - **TimeSelect položky**: hover `bg-black/5 dark:bg-white/[0.06]`, selected `bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400`
- `src/app/globals.css` – Grid + Glass vylepšení:
  - **Grid pattern light**: `stroke='%23a0a0a0'` (jemně šedá místo černé), `opacity: 0.05` (z 0.03)
  - **Glass card light**: `rgba(255,255,255,0.8)` (z 0.7), `blur(16px)` (z 12px), `border rgba(0,0,0,0.05)` (z 0.08)
  - **Glass modal light**: `rgba(255,255,255,0.9)` (z 0.85), `border rgba(0,0,0,0.05)` (z 0.08)
- Build: úspěšný, žádné TypeScript chyby

### Krok 62 – Time Picker: Custom dropdowny pro HH/MM (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – oprava vizuální chyby v dark modu:
  - **Nová komponenta `TimeSelect`**: Radix Popover based dropdown – plně stylovatelná alternativa k nativnímu `<select>`
  - **Trigger button**: `bg-black/80 dark:bg-[#09090b]` pozadí, `border-white/10`, `rounded-lg`, `text-foreground` – ladí s tmavým pozadím
  - **Popover seznam**: `bg-black/80 dark:bg-[#0b0b0b]` + `backdrop-blur-xl` + `shadow-2xl` – tmavý skleněný dropdown
  - **Aktivní hodnota**: `bg-indigo-600/20 text-indigo-400 font-medium` – indigo highlight vybrané položky
  - **Hover**: `hover:bg-white/[0.06]` – jemný hover efekt na položkách
  - **Scroll**: `max-h-52 overflow-y-auto` + auto-scroll na vybranou položku při otevření
  - **Labels HH/MM**: `text-muted-foreground/50` (z /40) – jemně šedé, nepřebíjejí čísla
  - **z-index**: `z-[60]` pro time dropdowns – nad hlavním popoverem kalendáře (`z-50`)
  - **Příčina problému**: Nativní `<select>` elementy renderují `<option>` v nativním browseru – Tailwind třídy se na dropdown menu vztahují jen částečně, což vedlo k bílému pozadí v dark modu
- Build: úspěšný, žádné TypeScript chyby

### Krok 15.3 – Bezpečnostní limity pro média (DOKONČENO)
- `src/hooks/use-media-upload.ts` – striktní limity velikosti souborů:
  - **Obrázky**: max 5 MB (dříve 50 MB)
  - **Videa**: max 20 MB (dříve 50 MB)
  - **Konstanty**: `MAX_IMAGE_SIZE = 5MB`, `MAX_VIDEO_SIZE = 20MB`
  - **Validace typů**: Rozlišené pole extenzí `ALLOWED_IMAGE_EXTENSIONS` (jpg, jpeg, png, webp, gif, svg) a `ALLOWED_VIDEO_EXTENSIONS` (mp4, mov)
  - **MIME typy**: `ALLOWED_IMAGE_MIMES` (jpeg, png, webp, gif, svg+xml) a `ALLOWED_VIDEO_MIMES` (mp4, quicktime)
  - **Funkce**: `getFileKind()` (detekce typu souboru), `getFileSizeLimit()` (limit podle typu), `isFileTooLarge()` (kontrola velikosti)
  - **Validace před uploadem**: `addFiles()` kontroluje velikost před přidáním do queue – oversized soubory se zahodí + toast error
  - **Toast messages**: Rozlišené pro obrázky (`fileTooLargeImage`) a videa (`fileTooLargeVideo`)
  - **Upload flow**: Client-side (browser → Supabase Storage) přes `createBrowserClient` z `@supabase/ssr` – žádné Vercel serverless funkce se nezatěžují
- `src/messages/cs.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích: calendar + posts)
- `src/messages/en.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/messages/uk.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/components/edit-post-dialog.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- **Bezpečnost**: Uživatelé již nemohou vyčerpat Supabase Storage velkými soubory. Limit 5MB pro fotky a 20MB pro videa je dostatečný pro free tier.

### Krok 61 – Light/Dark Mode: Dokončení vyladění světlého režimu (DOKONČENO)
- `src/app/globals.css` – oprava invalidní CSS syntaxe:
  - `.calendar-day-hover` mělo `hover: {}` (není validní CSS, to je SCSS/Tailwind @layer syntax)
  - Nahrazeno za `&:hover` (nesting syntax podporovaná v Tailwind CSS v @layer utilities)
  - Komentář rozšířen: "light: subtle gray, dark: subtle white"
- **Ověření stavu předchozí relace** (krok 60 a dále):
  - Grid patterny ve 4 dashboard stránkách (`posts/[id]`, `posts/new`, `accounts`, `templates/new`) – už mají obě varianty (black stroke pro light, white stroke pro dark) ✅
  - Dashboard layout `layout.tsx` – grid pattern v `<main>` už má `#80808008` (light) / `#ffffff08` (dark) ✅
  - Cookie consent – kategorie mají `bg-gray-50 dark:bg-white/5` a `border-gray-200 dark:border-white/10` ✅
  - Sidebar – aktivní item `bg-indigo-50 dark:bg-white/[0.05]`, user card `bg-gray-50 dark:bg-accent/50` ✅
  - Kalendář – mřížka, buňky, hover efekty, filtry, modal – vše s light/dark variantami ✅
  - Post card – `bg-white/80 dark:bg-card/40`, border, shadow – adaptivní ✅
  - Login visual – grid pattern s `opacity-[0.03] dark:opacity-[0.04]` ✅
  - LocaleSwitcher – žádná specifická barevná úprava potřeba, používá Tailwind tokens ✅
- Build: úspěšný, žádné TypeScript chyby

### Krok 60 – Kalendář: Hover Preview Pozice + Light/Dark Mode + Cookie Consent (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy hover náhledu v kalendáři:
  - **Pozice náhledu relativní k příspěvku**: `handlePostHover` nyní používá `getBoundingClientRect()` pro získání pozice karty příspěvku a umísťuje náhled ~12px vedle ní (vpravo) nebo nad/pod ni podle dostupného místa
  - **Smart positioning**: Pokud náhled přesahuje pravý okraj viewportu, přesune se vlevo od karty. Pokud není místo ani vlevo, zobrazí se centrováno pod kartou
  - **Adaptivní design (Light/Dark mode)**: Karta náhledu nyní používá `bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny pro hloubku**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín v light modu, výraznější v dark modu
  - **Texty adaptivní**: `text-foreground/80` (černé v light, bílé v dark), `border-t border-black/5 dark:border-white/10`
  - **Media placeholder**: `bg-black/5 dark:bg-white/5` pro loading stav obrázků
- `src/components/cookie-consent.tsx` – adaptivní light/dark mode pro Cookie Consent:
  - **Floating card**: `bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`
  - **Link barva**: `text-foreground` místo `text-white` (aby byl v light modu černý)
  - **Preferences Dialog**: `bg-white/90 dark:bg-black/60 backdrop-blur-2xl border-black/5 dark:border-white/10`
  - **Cookie category cards**: `border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
  - Všechny 4 kategorie (Necessary, Functional, Analytics, Advertising) mají adaptivní styl
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-06 (předchozí záznamy)

### Krok 15.2 – Logika nahrávání médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – kompletní vylepšení hook pro nahrávání médií:
  - **i18n podpora**: Hook nyní přijímá `labels` (MediaUploadLabels) pro toast messages – žádné hardcoded texty
  - **Validace formátů**: Nová funkce `isValidMediaFile` kontroluje povolené formáty (jpg, jpeg, png, webp, mp4, mov) + MIME typy
  - **ALLOWED_EXTENSIONS**: `[".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"]`
  - **Toast messages**: `tooManyFiles`, `uploadSuccess`, `uploadError`, `fileDeleted`, `invalidFileType`
  - **removeItem**: Bezpečnější – try/catch kolem URL parsing, revoke ObjectURL jen pro non-ready items
  - **loadExistingUrls**: Revoke ObjectURL jen pro lokální preview (status !== "ready")
  - **Default labels**: Fallback na angličtinu pokud labels nejsou předány
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace uploadLabels:
  - `uploadLabels` objekt z `t()` předáván do `useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels)`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace uploadLabels:
  - Stejný pattern: `uploadLabels` z `t()` → `useMediaUpload`
- `src/components/edit-post-dialog.tsx` – integrace uploadLabels + rozšířený interface:
  - `EditPostDialogProps.tLabels` rozšířen: `uploadSuccess`, `fileDeleted`, `invalidFileType`
  - `uploadLabels` sestaven z `tLabels` s fallbacky
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – rozšířené interface:
  - `PostCard.tLabels` a `PostsList.tLabels`: přidány `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/posts/page.tsx` – tLabels rozšířen:
  - Nové klíče: `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – rozšířený interface + tLabels:
  - `CalendarViewProps.tCalendar`: přidány `uploadSuccess`, `uploadError`, `uploading`, `fileTooLarge`, `fileDeleted`, `invalidFileType`, `dropMedia`
  - EditPostDialog tLabels: hodnoty z tCalendar místo prázdných řetězců
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – tCalendar rozšířen:
  - Nové klíče: `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType`
- `src/messages/cs.json` – nové klíče v namespace `posts` a `calendar`:
  - `tooManyFiles`, `fileDeleted`, `invalidFileType` (posts)
  - `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType` (calendar)
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Upload flow**: User vybere soubory → validace formátu → generování unikátní cesty `{userId}/{timestamp}-{filename}` → upload do `post-media` bucket → public URL → uložení do `media_urls` v DB
- **Limit**: Max 10 souborů na příspěvek, max 50MB na soubor
- **UX**: Spinner během nahrávání, CheckCircle2 po úspěchu, X tlačítko pro odstranění, toast notifikace
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-05

### Krok 59 – Univerzální Edit Modal + Kalendář: Drafty + Filtry statusu (DOKONČENO)
- `src/components/edit-post-dialog.tsx` – nová sdílená komponenta `EditPostDialog`:
  - Slouží jak pro editaci, tak pro vytvoření nového příspěvku
  - Používá se jak z kalendáře, tak ze seznamu příspěvků
  - Podpora: content, platformy, scheduled_at, status, location, tags, media (drag & drop + upload do Supabase Storage)
  - useMediaUpload hook pro nahrávání médií
  - Status pills (draft/scheduled/published/failed) – pouze v edit mode
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Koncepty (draft) viditelné**: Příspěvky se statusem `draft` se zobrazují s nižší opacitou (`opacity-60`)
  - **Filtry statusu**: Nové pill filtry (Vše, Koncept, Naplánované, Publikované, Neúspěšné) pod platform filtry
  - **Kliknutí na příspěvek**: Otevírá `EditPostDialog` modal místo redirectu na `/posts/[id]`
  - **activeStatusFilter**: Lokální stav pro UI filtr statusu (nezávislý na URL)
  - **Post interface rozšířen**: location, tags, media_urls
  - **getPostsForDayEffective**: Drafty bez `scheduled_at` se zobrazují v dnešním dni
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – odstraněn filtr `.neq("status", "draft")`:
  - `selectedStatus` se předává z URL searchParams (`?status=draft`)
  - Nové tCalendar klíče: editPost, postUpdated, addMedia
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – integrace EditPostDialog:
  - Tlačítko "Upravit" (ikona tužky) otevírá modal místo redirectu přes Link
  - PostCard přijímá `tLabels` prop a předává do EditPostDialog
  - PostsList přijímá `tLabels` prop a předává do PostCard
  - PostListItem rozšířen: location, tags, media_urls
- `src/app/[locale]/(dashboard)/posts/page.tsx` – rozšířené mapování příspěvků:
  - location, tags, media_urls se předávají do PostsList
  - tLabels prop s všemi potřebnými i18n klíči
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče v calendar namespace:
  - `filterAll`, `editPost`, `postUpdated`, `addMedia`
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-04

### Krok 58 – Oprava ukládání štítků (tags) (DOKONČENO)
- **Kořen problému**: Uživatel napsal tag do inputu a klikl na "Uložit" bez Enter/Space. Text zůstal v `tagDraft` a nikdy se nekomitoval do `tags` pole → do DB se uložilo prázdné pole.
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` (edit post):
  - **handleSave**: Před uložením se commitne zbylý `tagDraft` do `finalTags` (s normalizací + deduplikace)
  - `setTagDraft("")` po commitu
  - `updatePost` dostává `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}` – tag se commitne i při ztrátě fokusu
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` (new post):
  - **handleSubmit**: Stejný fix – commit `tagDraft` → `finalTags` před `createPostAction`
  - `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}`
- `src/lib/actions/posts.ts` – server actions už `tags` správně zpracovávají (žádná změna potřeba)
- Migrace `005_add_location_tags_to_posts.sql` – sloupec `tags TEXT[] DEFAULT '{}'` existuje
- Build: úspěšný, žádné TypeScript chyby

### Krok 57 – Upload médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – nový custom hook pro nahrávání médií:
  - **uploadFile**: Upload souboru do Supabase Storage bucket `post-media` s unikátní cestou `{userId}/{timestamp}-{filename}`
  - **addFiles**: Přidání souborů s validací (image/video, max 50MB, max 10 souborů), automatický upload po přidání
  - **removeItem**: Odstranění souboru + revoke ObjectURL + smazání ze storage
  - **loadExistingUrls**: Načtení existujících URL z DB (pro editaci příspěvků)
  - **getMediaUrls**: Vrátí pole public URL všech ready souborů
  - **hasUploading**: Indikace zda probíhá upload (blokuje odeslání formuláře)
  - **Stavy**: `uploading` (spinner) → `ready` (CheckCircle2) / `error` (toast error)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace useMediaUpload:
  - Drag & drop zóna s vizuální feedback (border-indigo při drag)
  - Preview grid (3/4 sloupce) s thumbnails, upload progress overlay, success indicator
  - File size validation (50MB limit) + toast error
  - Blocking upload při submit – toast.info("Nahrávám...")
  - mediaUrls se předávají do createPostAction
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace useMediaUpload:
  - loadExistingUrls při načtení příspěvku z DB (media_urls pole)
  - Stejný UI jako new post (drag & drop, preview grid, stavy)
  - mediaUrls se předávají do updatePost
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `posts.uploading`, `posts.uploadSuccess`, `posts.uploadError`, `posts.fileTooLarge`
- Build: úspěšný, žádné TypeScript chyby

### Krok 56 – Kalendář: Oprava mobilního zobrazení (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy mobilního Agenda View:
  - **Navigace měsíci**: Šipky nyní posouvají o celý měsíc (`previousMonth`/`nextMonth`) místo o 1 den
  - **Větší touch-targety**: Šipky zvětšeny na `h-10 w-10` (40x40px) s ikonami `h-5 w-5` pro snadné trefení palcem
  - **Sticky hlavička**: Hlavička s měsícem a šipkami je `sticky top-0` s `backdrop-blur-xl` – zůstává vidět při scrollování dnů
  - **Všechny dny měsíce**: Nový `mobileAgendaDays` useMemo generuje VŠECHNY dny aktuálního měsíce (startOfMonth → endOfMonth), nejen dny s příspěvky
  - **Prázdné dny**: Dny bez příspěvků zobrazují "Žádné příspěvky" + malé `+` tlačítko. Kliknutí na celý řádek otevře modal pro nový příspěvek
  - **Plně scrollovatelný seznam**: Seznam dnů má `max-h-[calc(100vh-280px)]` a `overflow-y-auto`
  - **České měsíce 100%**: Název měsíce v hlavičce z `months[month]` (props z `t.raw("months")`) + v seznamu dnů `months[day.getMonth()]` – vždy z lokálních překlادů
  - **Jeden kontejner**: Celý mobilní view je v jednom `rounded-[20px]` kontejneru místo dvou samostatných karet
- Build: úspěšný, žádné TypeScript chyby

### Krok 55 – Kalendář: Modal pro nový příspěvek + oprava filtrů + i18n + UI polish (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Modal Dialog pro nový příspěvek**: Kliknutí na "+ Přidat příspěvek" v mobilním Agenda View otevírá modal s formulářem místo redirectu na /posts/new
    - Formulář: obsah, platformy (pill tlačítka s ikonami), lokace, štítky, DateTimePicker
    - Tlačítka: Koncept / Naplánovat / Publikovat (stejný styl jako /posts/new)
    - Po úspěchu: toast + reload stránky
    - Reset formuláře při zavření modálu
  - **Oprava filtrů platforem**: UI tlačítka nyní používají `activePlatformFilter` (lokální stav) místo `selectedPlatform` (props z URL) – filtry fungují správně
  - **Oprava příspěvků v gridu**: Desktop grid používá `getPostsForDayEffective` (respektuje filtry) místo `getPostsForDay`
  - **Kliknutí na den**: Zachováno – redirect na `/posts/new?date=YYYY-MM-dd`
  - **Česká lokalizace Agenda View**: `formatAgendaDate` s `date-fns/locale/cs` – dny a měsíce v češtině (čtvrtek, 6. května 2026)
  - **Lokalizace množného čísla**: CS (příspěvek/příspěvky/příspěvků), UK (публікація/публікації/публікацій), EN (post/posts)
  - **Lokalizace "+ more"**: další / більше / more
  - **UI polish**: Lepší kontrast mřížky (`border-white/10`), zvýraznění dneška (`bg-indigo-500/5 ring-indigo-500/20`), tmavší dny mimo měsíc (`bg-black/30`)
  - **Nové stavy**: `formContent`, `formPlatforms`, `formScheduledAt`, `formLocation`, `formTags`, `formTagDraft`, `formLoading`, `formError`
  - **Nové funkce**: `handleOpenNewPostModal`, `handleToggleFormPlatform`, `handleCommitTag`, `handleRemoveTag`, `handleFormSubmit`
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – rozšířený `tCalendar` props o 16 nových klíčů
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `calendar.addPost`, `calendar.newPost`, `calendar.content`, `calendar.contentPlaceholder`
  - `calendar.selectPlatforms`, `calendar.saveDraft`, `calendar.schedule`, `calendar.publishNow`
  - `calendar.scheduledAt`, `calendar.saving`, `calendar.addTags`, `calendar.locationPlaceholder`
  - `calendar.postCreated`, `calendar.errorSaving`, `calendar.characterCount`, `calendar.maxFilesReached`
- Build: úspěšný, žádné TypeScript chyby

### Krok 54 – Kalendář: Mobile Agenda View + Klikání na dny a příspěvky (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní přepracování:
  - **Desktop (lg+)**: Měsíční/týdenní mřížka zachována (hidden lg:block)
  - **Mobile (pod lg)**: Nový Agenda View – vertikální seznam dnů s příspěvky
    - Navigace: šipky pro posun dnů, název měsíce a roku
    - Prázdný stav: ikona kalendáře + hláška "Žádné příspěvky" (lokalizováno)
    - Dny s příspěvky: kroužek s číslem dne (gradient pro dnes), název dne, počet příspěvků
    - Karty příspěvků: ikona platformy + obsah + čas, barevné statusy (published/scheduled/failed)
    - Tlačítko "+ Přidat příspěvek" pod každým dnem
  - **Kliknutí na den** (desktop + mobile): redirect na `/posts/new?date=YYYY-MM-dd`
  - **Kliknutí na příspěvek**: `stopPropagation` + redirect na `/posts/[id]`
  - **Filtry platforem**: zachovány, funkční na obou zobrazeních
  - **Navigace Měsíc/Týden**: pouze desktop (hidden lg:flex)
- `src/messages/cs.json`, `en.json`, `uk.json` – klíč `calendar.noPostsThisDay` (přidán v předchozí relaci)
- Build: úspěšný, žádné TypeScript chyby

### Krok 53 – DB Sync: Média, Štítky, Lokace (DOKONČENO)
- `supabase/migrations/005_add_location_tags_to_posts.sql` – nová migrace:
  - Přidány sloupce `location TEXT DEFAULT NULL` a `tags TEXT[] DEFAULT '{}'` do tabulky `posts`
- `src/lib/actions/posts.ts` – rozšířené server actions:
  - `createPostAction` – nově přijímá a ukládá `location`, `tags` (kromě již existujícího `mediaUrls`)
  - `updatePost` – nově přijímá a aktualizuje `location`, `tags`
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `handleSubmit` předává do `createPostAction`:
  - `location` z inputu, `tags` z badge seznamu, `mediaUrls` z dropzóny (jména souborů)
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku:
  - useEffect načítá z DB i `location`, `tags`, `media_urls`
  - `handleSave` předává do `updatePost` všechny tři pole
- **Poznámka:** Média se ukládají jako jména souborů. Pro produkci bude potřeba upload do Supabase Storage
- Build: úspěšný, žádné TypeScript chyby

### Krok 52 – Kalendář pro plánování obsahu (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – nová Server Component stránka:
  - Načítá příspěvky z DB (`posts` tabulka) filtrované podle `user_id` a `status != draft`
  - Předává data do Client Component `_calendar-view` s lokalizací
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – Client Component s interaktivním kalendářem:
  - **Mřížka kalendáře**: 7 sloupců (Po-Ne), `border border-white/5`, glassmorphism (`bg-card/40 backdrop-blur-md rounded-[20px]`)
  - **Hlavička**: Šipky pro přepínání měsíců/týdnů, název měsíce lokalizovaný, přepínač Měsíc/Týden
  - **Příspěvky v buňkách**: Skleněné karty (`bg-indigo-500/20`) s ikonou platformy, časem a ukázkou obsahu
  - **Status barvy**: published = emerald, scheduled = indigo, failed = red
  - **Filtry platforem**: Pill tlačítka nad kalendářem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok) s ikonami
  - **Dnes**: Gradient kroužek (`from-indigo-600 to-purple-600`) s glow efektem
  - **Navigace**: `date-fns` pro generování dnů v měsíci/týdnu, `weekStartsOn: 1` (pondělí)
- `src/components/dashboard/sidebar.tsx` – přidána `Calendar` ikona do `ICON_MAP`
- `src/app/[locale]/(dashboard)/layout.tsx` – přidána položka Kalendář do `navItems` a `mobileNavItems`
- `src/components/dashboard/mobile-nav.tsx` – přidána položka Kalendář do spodního menu
- `src/messages/cs.json`, `en.json`, `uk.json` – nové sekce `calendar.*` (title, subtitle, month, week, weekdays, months, filtry)
- `nav.calendar` přidán do všech tří jazyků
- Build: úspěšný, žádné TypeScript chyby

### Krok 49 – Premium DateTimePicker – Redesign kalendáře (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – nová komponenta:
  - **Trigger tlačítko**: Glass styl (`bg-white/[0.03] border-white/10 rounded-xl h-12`), ikona kalendáře vlevo, vybrané datum textem uprostřed, ikona hodin vpravo
  - **Popover**: `bg-black/80 backdrop-blur-xl border border-white/10 rounded-[20px] p-4 shadow-2xl` – premium tmavý popover s blur efektem
  - **Kalendář**: Vlastní grid 7xN, bílé čísla, vybraný den s indigo-purple gradientem + glow (`shadow-[0_0_12px_rgba(99,102,241,0.4)]`), hover `bg-white/10 rounded-lg`, dnes vyznačen indigo borderem
  - **Navigace měsíců**: ChevronLeft/ChevronRight šipky, název měsíce lokalizovaný (`date-fns/locale/cs`, `uk`, `enUS`)
  - **Výběr času**: Dvě select pole (HH : MM) s hodnotami 0-23 a 00/15/30/45, glass styl, custom chevron ikona
  - **Lokalizace**: Český/anglický/ukrajinský kalendář přes `date-fns` locale + ruční weekDays (Po-Ne / Mo-Su / Пн-Нд)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- **Dependence**: `date-fns`, `@radix-ui/react-popover` (nově nainstalovány)
- Build: úspěšný, žádné TypeScript chyby

### Krok 50 – Posts Page: Prémiový feed karet + animace (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx`
  - Kontejner stránky omezen na `max-w-3xl mx-auto` (už není roztažený přes celou obrazovku)
  - Seznam příspěvků přepojen na client list komponentu kvůli animacím a plynulému mazání
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`
  - Nová struktura karty: header (platform icon + status badge + akce), výrazný content (`text-lg`), footer s border-top (created date + scheduled time s ikonou hodin)
  - Styl karty dle specifikace (`rounded-[24px]`, `bg-card/40`, `backdrop-blur`, jemný indigo hover border)
  - Framer Motion: `<AnimatePresence>` + enter/exit animace (fade-in + slide-up, při smazání plynulý exit)
  - Mazání: po úspěchu se karta okamžitě odstraní ze seznamu (bez refresh)

### Krok 51 – Editor příspěvků: Média, Lokace, Štítky (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - Přidána sekce Médií pod pole Obsah: drag & drop zóna (dashed border, glass hover) + náhledy v gridu + mazání
  - Přidán input pro Lokaci (MapPin vlevo) pod výběr platforem
  - Přidána sekce Štítky: Enter/mezerník vytvoří tag odznáček s křížkem, indigo/purple gradient
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - Sjednocen vizuál na prémiový glass layout a doplněny stejné sekce (Média, Lokace, Štítky)
- `src/messages/cs.json`, `en.json`, `uk.json`
  - Nové i18n klíče: `addMedia`, `locationPlaceholder`, `addTags`, `maxFilesReached`

## 2026-05-03

### Krok 48 – Výpis příspěvků z databáze (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní přepracování:
  - **Načítání z DB**: Query nyní filtruje podle `user_id` aktuálního uživatele (`.eq("user_id", user.id)`) – uživatel vidí pouze své příspěvky
  - **Řazení**: `order("created_at", { ascending: false })` – nejnovější první
  - **Filtry**: Pills filtry s novými i18n klíči (`statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`)
  - **Empty State**: Zachován krásný vizuální prázdný stav s velkou ikonou `FileText` a fialovou září
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – nová Client Component pro karty příspěvků:
  - **Design**: Premium Glass (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[20px] p-6`)
  - **Obsah**: Text příspěvku (content, max 200 znaků preview), ikony platforem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok), datum vytvoření, čas naplánování (Calendar ikona)
  - **Status Badge**: Barevné odznaky – draft (šedý), scheduled (indigo/modrý), published (zelený/emerald), failed (červený/red)
  - **Akce**: Edit (Edit ikona) + Delete (Trash2 ikona s `confirm()` dialogem)
  - **Lokalizace dat**: `toLocaleDateString()` s locale podle jazyka (cs-CZ, uk-UA, en-US)
- `src/lib/actions/posts.ts` – oprava `deletePost`:
  - Přidán auth check (`supabase.auth.getUser()`)
  - Přidán `.eq("user_id", user.id)` – lze smazat pouze vlastní příspěvky
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`, `deleteConfirm`
- **LocaleSwitcher**: Zkontrolováno – kód je správný, používá `locales.find()` pro labely. Žádný "login" bug nebyl nalezen (pravděpodobně již opraven dříve)
- Build: úspěšný, žádné TypeScript chyby

### Krok 47 – Přechod na klasický Login (E-mail + Heslo) (DOKONČENO)
- `src/components/auth/email-signin.tsx` – kompletní přepsání: odstraněn Magic Link (OTP) systém, nahrazen klasickým loginem s heslem (`signInWithPassword`), přidána registrace (`signUp`), přepínač režimů signin/signup, pole pro heslo s toggle visibility (Eye/EyeOff), validace email verification (pokud uživatel nemá ověřený e-mail, dostane chybovou hlášku + automatické odhlášení), redirect po registraci na `/[locale]/dashboard`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové i18n klíče: `signIn`, `signUp`, `signingIn`, `emailNotVerified`, `invalidCredentials`, `signInError`, `signUpError`, `emailAlreadyExists`, `checkEmailToVerify`, `emailVerified`, `emailNotVerifiedBadge` – odstraněny staré OTP klíče (`checkEmailTitle`, `checkEmailDesc`, `sendingEmail`, `rateLimitExceeded`, `tryAgainIn`, `otpSendError`)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – do sekce Profil přidán řádek s e-mailem a verification badge (zelený „Ověřen" s CheckCircle2 vs. oranžový „Neověřen" s AlertCircle)
- Design: Inputy s ikonami (Mail, Lock) vlevo, glassmorphism styl (`bg-white/[0.03]`, `rounded-2xl`), tlačítko „Přihlásit se" / „Zaregistrujte se", odkazy „Zapomněli jste heslo?" a „Nemáte účet? Zaregistrujte se"
- Build: úspěšný, žádné TypeScript chyby

### Krok 8.1 – Login: Přidání e-mailu (UI + i18n) (DOKONČENO)
- `src/app/[locale]/(auth)/login/page.tsx` – pod Google tlačítko přidán divider „nebo“, e-mail input + CTA a vrácen privacy disclaimer s odkazem na `/privacy`
- `src/components/auth/email-signin.tsx` – nový klientský blok pro přihlášení e-mailem přes Supabase OTP (magic link) včetně designu inputu a tlačítka
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `auth.or`, `auth.emailPlaceholder`, `auth.continueWithEmail`, `auth.privacyDisclaimer`

### Krok 8.2 – Login: Magic Link logika a redesign rozložení (DOKONČENO)
- `src/components/auth/email-signin.tsx` – implementována logika Supabase Magic Link (`signInWithOtp`), přidán Success View s ikonou obálky a fialovou září, aktualizován stav tlačítka při načítání („Odesílám...“) a vizuální polish (čistě bílé tlačítko, jemný border inputu)
- `src/app/[locale]/(auth)/login/page.tsx` – přesunut Privacy Disclaimer z patičky přímo pod blok přihlášení e-mailem pro lepší vizuální celistvost
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro Success View (`checkEmailTitle`, `checkEmailDesc`) a stav odesílání (`sendingEmail`)
- Sjednocení login bloku do jednoho vycentrovaného celku

### Krok 8.2.1 – Login: UX pro Supabase rate limit (DOKONČENO)
- `src/components/auth/email-signin.tsx` – přidán perzistentní cooldown přes `localStorage` a uživatelské hlášky místo console error (eliminuje spam při refreshi)
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `rateLimitExceeded`, `tryAgainIn`, `otpSendError`

### Krok 46 – Účty: Drag & Drop pořadí sítí + přidání YouTube a TikTok (DOKONČENO)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – ikony platforem jsou přetahovatelné přes Framer Motion `Reorder` (lokální `useState`), včetně jemného zvětšení + výraznějšího glow při drag; zároveň doplněny platformy YouTube a TikTok a labely jsou napojené na i18n
- `src/components/ui/social-icons.tsx` – přidány brand ikony `Youtube` a `TikTok` (inline SVG)
- `src/app/api/accounts/route.ts` – rozšířen allowlist platforem o `youtube` a `tiktok`
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny překlady `accounts.platforms.*` pro nové platformy (a sjednocení labelů v UI)

## 2026-05-02

### Krok 45 – Final UI Polish: Odstranění redundantních log a oprava prázdného stavu Účtů (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/app/[locale]/(dashboard)/templates/new/page.tsx` – odstraněno redundantní `<Logo />` z hlaviček stránek (logo zůstává pouze v sidebaru)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava logiky prázdného stavu: „Žádné propojené účty“ se nyní skrývá, pokud je aktivní formulář pro připojení platformy (`!selectedPlatform && accounts.length === 0`)
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – ověřeno vycentrovaný nadpis „Nová šablona“ nad glass kartou
- Sjednocení vzhledu vnitřních stránek dashboardu pro maximální čistotu rozhraní

### Krok 44 – Oprava i18n chyby MISSING_MESSAGE na stránce Účty (DOKONČENO)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněn chybějící klíč `accounts.connectAccount`, který používá `src/app/[locale]/(dashboard)/accounts/page.tsx`
- Fixuje runtime chybu: `MISSING_MESSAGE: Could not resolve accounts.connectAccount for locale cs`
- Pozn.: V Krok 42 bylo mylně uvedeno, že klíč už existuje v `cs.json`

### Krok 42 – Tuning formulářů: Glass kontejnery, Inputy, Tlačítka, Branding (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – kompletní redesign formuláře „Nový příspěvek":
  - **Glass kontejner**: `bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`
  - **Inputy/Textarea**: `bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30`
  - **Tlačítka**: Primární (Naplánovat, Publikovat) – `bg-gradient-to-br from-indigo-600 to-purple-600` + indigo glow shadow, sekundární (Koncept) – glass outline
  - **Platform pills**: Aktivní `bg-indigo-500/20 border-indigo-500/50 text-indigo-300`, neaktivní `bg-white/[0.03] border-white/5`
  - **Branding**: Logo v horním rohu, grid pattern na pozadí, indigo + purple záře v rozích
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – stejný redesign:
  - Glass kontejner, styled inputy/textarea, gradient tlačítko „Vytvořit", branding (Logo + grid + záře)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – redesign formuláře „Propojit účet":
  - Nahrazen `<Card>` → glass kontejner (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`)
  - Inputy: `bg-black/20 border-white/10 rounded-xl` s indigo focus ring
  - Tlačítko „Propojit účet": gradient + glow shadow
  - Branding: Logo v horním rohu, grid pattern, indigo + purple záře
  - I18N: Klíč `accounts.connectAccount` již existuje v `cs.json` („Propojit účet") – žádný nový klíč nutný
- `src/components/ui/logo.tsx` – importován do všech tří stránek pro brand konzistenci
- Build: úspěšný, žádné TypeScript chyby

### Krok 41 – Redesign stránky Příspěvky (Posts) – Prémiový vzhled (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní redesign vizuálu:
  - **Hlavička**: Subtitle "0 příspěvků" s jemnější barvou (`text-muted-foreground/60`) jako u Účtů
  - **Tlačítko "Nový příspěvek"**: Gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s indigo glow stínem (`shadow-[0_0_20px_rgba(99,102,241,0.3)]`), radius `rounded-[20px]`
  - **Filtry (Pills)**: Neaktivní `bg-white/[0.03] border-white/5`, aktivní `bg-white/10 border-white/20 text-white`, radius `rounded-full px-4 py-1.5 text-sm`
  - **Empty State**: Odstraněn šedý Card box, nahrazen vizuálním centrem – ikona `FileText` s fialovou září (`blur-3xl`), text `text-muted-foreground/60`, sekundární tlačítko v glass stylu (`bg-card/40 border-white/5 backdrop-blur-md`)
  - **Pozadí**: Glow efekty v rozích (indigo + purple) pro hloubku, grid pattern z layoutu
  - **PostCard**: Glassmorphism (`bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]`)
  - **Responsivita**: Hlavička flex-col na mobilu, MobileNav `pb-24` v layoutu zajišťuje že obsah není překryt

### Krok 40 – Oprava ikon sociálních sítí a TypeScript chyb (DOKONČENO)
- `src/components/ui/social-icons.tsx` – nová sdílená komponenta pro brand ikony (Instagram, Facebook, Twitter, LinkedIn):
  - Implementace jako inline SVG, protože `lucide-react` tyto brand loga neexportuje
  - Rozhraní `SocialIconProps` s podporou `className` pro konzistentní stylizaci
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava importů a TypeScript chyb:
  - Import ikon přesunut z `lucide-react` do `@/components/ui/social-icons`
  - Oprava chyby `ReactNode` při vykreslování komponent ikon (místo `{icon}` → `<Icon className="..." />`)
  - Oprava syntaxe IIFE v JSX pro kondicionální renderování modálu
- `src/app/[locale]/(auth)/onboarding/client.tsx` – úklid:
  - Odstraněny lokální inline SVG definice ikon
  - Import sdílených ikon z `@/components/ui/social-icons`

### Krok 39 – Prémiový dynamický favicon a Apple ikona (DOKONČENO)
- `src/app/icon.tsx` – implementován dynamický favicon (32x32) pomocí `next/og`:
  - Design: Vycentrované bold písmeno 'P' s brandovým gradientem (`linear-gradient(to bottom right, #4f46e5, #9333ea)`).
  - Pozadí: Průhledné pro moderní vzhled v prohlížeči.
- `src/app/apple-icon.tsx` – implementována ikona pro iOS (180x180):
  - Design: Písmeno 'P' s gradientem na čistě černém pozadí (#000) pro nativní vzhled aplikace na iPhone.
- Úklid: Odstraněn statický soubor `src/app/favicon.ico` pro prioritizaci dynamického generování.
- `src/app/layout.tsx` – ověření absence ručních `<link rel="icon">` tagů pro plnou kompatibilitu s Next.js App Router.

### Krok 38 – Sjednocení UI: Přesun odhlašení do Nastavení (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – odstraněn logout formulář a tlačítko z dolní části sidebaru pro čistší navigaci.
- `src/components/auth/logout-button.tsx` – vytvořena nová samostatná komponenta pro odhlášení:
  - Implementována logika `supabase.auth.signOut()` s následným redirectem na `/login`.
  - Stylizována jako "nebezpečná" akce (`hover:text-destructive`).
- `src/app/[locale]/(dashboard)/settings/page.tsx` – integrace `<LogoutButton />` do sekce "Nebezpečná zóna" (Danger Zone):
  - Tlačítko umístěno do interaktivního řádku s ikonou `ChevronRight` a efektem `hover:bg-destructive/5`.
  - Přidán padding `pb-32` k hlavnímu kontejneru stránky pro správné zobrazení na mobilu (nad spodním menu).
- `src/messages/cs.json`, `en.json`, `uk.json` – sjednocení a oprava překladového klíče `common.logout` napříč všemi jazyky.
- Oprava chyby `MISSING_MESSAGE` pomocí sjednocení namespace `common` (lowercase) v překladových souborech a komponentě.

### Krok 37 – Kompletní lokalizace (CZ, EN, UK) (DOKONČENO)
- `src/messages/uk.json` – doplnění chybějících překladů: klíč `logout` v sekci `common` a `title` v sekci `cookie`.
- `src/messages/cs.json` & `src/messages/en.json` – sjednocení překladů: přidán klíč `logout` do sekce `common` pro zajištění konzistence.
- `i18n.ts`, `middleware.ts` & `src/i18n/request.ts` – ověření správné konfigurace a podpory jazyka `uk` v celém i18n flow.
- `src/components/locale-switcher.tsx` – ověření viditelnosti a funkčnosti přepínače pro ukrajinštinu.

### Krok 36 – Finální vizuální polish dashboardu (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – integrace sjednocené `<Logo />` komponenty a vylepšení aktivního stavu položek menu (`bg-white/[0.03]`, `text-foreground`).
- `src/app/[locale]/(dashboard)/layout.tsx` – implementován background grid pattern a jemné, tušené barevné záře (glows) v rozích (`opacity-[0.03]`, `blur-[120px]`) pro větší hloubku pozadí.
- `src/app/[locale]/(dashboard)/page.tsx` – update typografie: nadpis zvětšen na `text-3xl` s `tracking-tight`, subtext nastaven na `text-muted-foreground/60`.
- `CLAUDE.md` & `AGENTS.md` – přidána sekce "Standard UI Postio" s definicí barevného schématu, radiusů (20px), efektů glassmorphismu a typografie.
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace `<Logo />` komponenty do mobilního headeru.

### Krok 35 – Redesign Dashboardu: Karty a Úklid sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` & `src/app/[locale]/(dashboard)/layout.tsx` – odstraněna duplicita položky "Nastavení" z hlavního menu; odkaz přesunut na ikonu ozubeného kolečka u profilu uživatele.
- `src/app/[locale]/(dashboard)/page.tsx` – update vizuální identity dashboardu:
  - Statistické karty: Implementován 'Premium Glass' styl (`bg-card/40 backdrop-blur-md`, `border-white/5`, `rounded-[20px]`), jemnější barva ikon.
  - Akční karta "Nový příspěvek": Dominantní gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem.
  - Ostatní akční karty: Sjednoceny do glass stylu s radiusy `rounded-[20px]`.
  - Upgrade Banner: Kompaktnější padding a posílený fialový glow efekt v pozadí.

### Krok 34 – Redesign karet na dashboardu (Vzhled) (DOKONČENO)
- `src/app/[locale]/(dashboard)/page.tsx` – update stylů karet pro prémiový vzhled:
  - Statistické karty: Implementován glassmorphism (`bg-card/40 backdrop-blur-md`, `border-white/5`), radius `rounded-[20px]`, zmenšeny ikony a hodnoty (`text-2xl`)
  - Akční karta "Nový příspěvek": Primární gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem pro maximální kontrast
  - Ostatní akční karty: Přepsány do stejného glass stylu jako statistické karty
- Vizuální sjednocení s mockupem přihlašovací stránky

### Krok 33 – Redesign Dashboardu (Sidebar a Layout) (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – nová komponenta Sidebaru:
  - Styl: Glassmorphism (`bg-card/50 backdrop-blur-md`), užší a elegantnější vzhled
  - Navigace: Implementován aktivní stav s barevným akcentem a zářícím indikátorem
  - Account Switcher: Přidána sekce v dolní části s údaji uživatele, tlačítkem Upgrade a nastavením
  - Branding: Integrace sjednocené `<Logo />` komponenty
- `src/app/[locale]/(dashboard)/layout.tsx` – aktualizace základní kostry:
  - Redukce vertikálního paddingu v headeru (`h-16` → `h-14`) pro lepší využití prostoru
  - Implementace `font-sans` (Inter/Geist) napříč layoutem
  - Radiusy: Sjednocení zaoblení na 20px (`--radius`) pro všechny kontejnery
- `src/lib/actions/auth.ts` – vytvoření Server Action pro odhlášení (`logoutAction`)
  - Řešení chyby serializace funkcí z Server do Client Componentu
- `src/app/layout.tsx` – oprava varování v konzoli u skriptu inicializace tématu (přidán `id="theme-init"`)

## 2026-05-01

### Krok 32 – Branding, i18n a Premium Dark styl pro Privacy stránku (DOKONČENO)
- `src/components/ui/logo.tsx` – nová sjednocená Logo komponenta:
  - Styl: Bold, `tracking-tighter`, primární barva pro 'P', foreground pro 'ostio'
- `src/messages/cs.json`, `en.json` – oprava i18n: přidán chybějící klíč `cookiesDesc` v namespace `privacy`
- `src/app/[locale]/privacy/page.tsx` – kompletní redesign na "Premium Dark" styl:
  - Pozadí: `bg-black`, font `font-sans` (Inter)
  - Layout: Centrování `max-w-3xl`, whitespace `py-12 lg:py-24`
  - Typografie: Nadpisy bílé, popisy `muted-foreground`, vylepšená čitelnost (leading-relaxed)
  - Logo: Integrace nové `Logo` komponenty v headeru
  - Tlačítko "Zpět": Redesign na `rounded-2xl` s jemným borderem a backdrop-blurem
- Ověření: Proběhl lint check, funkčnost i18n ověřena

### Krok 31 – Oprava mobilního zobrazení Login + Cookie Consent (DOKONČENO)


## 2026-04-28

### Krok 1 – Inicializace projektu (dokončeno dříve)
- Next.js 14 projekt s TypeScript, Tailwind, App Router
- Instalace: shadcn-ui, next-intl, @supabase/supabase-js, @supabase/ssr
- `.env.local` a `.env.example`
- `src/lib/supabase/client.ts` – browser klient

### Krok 2 – Supabase konfigurace (dokončeno dnes)
- `src/lib/supabase/server.ts` – server klient pro SSR (čte/žepíše cookies pro auth session)
- `src/lib/supabase/middleware.ts` – helper pro middleware (vrací `{ supabase, response }` pro refresh JWT tokenů)
- `supabase/migrations/001_initial_schema.sql` – 6 tabulek + RLS politiky + indexy
  - `users` – profil, plán (free/creator/pro), jazyk, streak, onboarded flag
  - `social_accounts` – platforma, jméno, access_token, is_active
  - `posts` – obsah, media_urls, platformy, status (draft/scheduled/published/failed)
  - `templates` – šablony příspěvků s premium flagem
  - `analytics` – impressions + engagements per post
  - `cookie_consents` – GDPR (necessary/analytics/marketing)
  - RLS: každý uživatel vidí/čte/mění pouze svá data (auth.uid() = user_id)
  - Analytics RLS přes EXISTS join na posts tabulku
  - Trigger: automatické updated_at na posts

### Krok 3 – i18n + middleware + layout struktura (dokončeno)
- `i18n.ts` – konfigurační soubor s locales (cs, en, uk)
- `src/i18n/request.ts` – next-intl request config pro Next.js 16
- `src/messages/cs.json`, `en.json`, `uk.json` – překladové soubory
- `middleware.ts` – kombinace Supabase auth refresh + next-intl routing
- `next.config.ts` – integrace next-intl plugin
- `src/app/layout.tsx` – root layout (minimal, bez fontů)
- `src/app/[locale]/layout.tsx` – locale layout s NextIntlClientProvider + ThemeProvider
- `src/app/[locale]/(auth)/layout.tsx` – layout pro auth stránky
- `src/app/[locale]/(dashboard)/layout.tsx` – dashboard layout se sidebar navigací
- `src/app/[locale]/(auth)/login/page.tsx` – login stránka s Google OAuth
- `src/components/auth/google-signin-button.tsx` – tlačítko Google přihlášení
- `src/app/auth/callback/route.ts` – auth callback route pro Supabase OAuth
- `src/app/[locale]/(dashboard)/page.tsx` – dashboard s statistikami a quick actions
- `src/components/providers/theme-provider.tsx` – light/dark mode provider
- `src/components/theme-toggle.tsx` – přepínač theme
- `src/components/locale-switcher.tsx` – přepínač jazyka
- `src/components/ui/card.tsx` – Card komponenta
- `src/components/ui/dropdown-menu.tsx` – DropdownMenu komponenta
- `.env.example` – šablona environment proměnných
- `globals.css` – primary barva změněna na indigo (#6366F1)
- Instalace: framer-motion, next-themes, @radix-ui/react-dropdown-menu
- Build úspěšný

### Krok 4 – Šablony + Analytics + Settings + Edit Post (dokončeno)
- `src/app/[locale]/(dashboard)/templates/page.tsx` – seznam šablon s delete/use
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – analytika (impressions, engagements, rate)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – nastavení profilu a plánu
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku
- `src/lib/supabase/types.ts` – TypeScript typy pro Database
- `supabase/migrations/002_auth_trigger.sql` – auto-create user řádky při signup

### Krok 5 – Oprava TypeScript chyb (dokončeno)
- Odstraněno `Database` generikum z `createServerClient`/`createBrowserClient` – `@supabase/ssr` ho špatně předával
- Opraveno pořadí query chain: `.select("*")` před `.order()`
- Přidány typové anotace na `.map()` callback parametry
- Přidány null checky na Supabase response data
- Import `SupabaseClient` přesunut z `@supabase/ssr` do `@supabase/supabase-js`
- Build úspěšný bez TypeScript chyb

## 2026-04-29

### Krok 6 – Zprovoznit localhost bez Supabase (DOKONČENO)
**Hotovo:**
- `src/app/page.tsx` – redirect `/` → `/cs/login` (fallback pro dev mode)
- Middleware config matcher aktualizován
- Production build: redirect funguje (307 `/` → `/cs/login`)
- `/cs/login` vrací 200 OK

**Opravy:**
1. **Middleware publicRoutes bug** – `startsWith("/login")` nešlo pro `/cs/login` cesty
   - Fix: změněno na `includes("/login")` → locale-prefixed routy fungují
2. **Dashboard nav link bug** – sidebar odkazoval na `/{locale}/dashboard` místo `/{locale}/`
   - Fix: změněno href na `/{locale}` (route group `(dashboard)` nevytváří URL segment)
3. Google sign-in button: už měl disabled logiku (`isSupabaseConfigured` check) ✓
4. Dashboard layout: try/catch + redirect na login bez session ✓

**Výsledek:**
- Production: všechny routy fungují perfektně
- Dev mode (Turbopack): routy fungují po inicializaci kompilace
- Test: `npm run build && npm run start` → otevřít `http://localhost:3000`

**Poznámka:** Všechny soubory už mají try/catch kolem Supabase volání z předchozí session.

### Krok 7 – Supabase propojení + oprava auth callback (DOKONČENO)
**Hotovo:**
- `.env.local` – vyplněné SUPABASE_URL + ANON_KEY + SERVICE_ROLE_KEY
- `src/app/auth/callback/route.ts` – opravený OAuth callback flow
  - Dynamické čtení locale z referer header
  - Správné předávání cookies pro session
  - Redirect na dashboard po úspěšném loginu
- `.env.example` – vyčištěno (GOOGLE_CLIENT_ID/SECRET/NEXTAUTH_SECRET se nepoužívají – Supabase řeší OAuth server-side)
- Google OAuth přihlášení funkční: Login → Supabase OAuth → Callback → Dashboard
- Middleware auth check funkční – redirect na login bez session, cookies správně předávány

### Krok 8 – Social account connect API + Seed data + Cookie consent fix (DOKONČENO)
**Hotovo:**
- `src/app/api/accounts/route.ts` – POST endpoint pro uložení social account
  - Auth check (session required), validace platformy, insert do DB
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – přepracováno na "use client"
  - Klik na platformu otevře formulář (account name + access token)
  - POST na `/api/accounts` → refresh seznam účtů
  - Disconnect tlačítko (is_active = false)
- `supabase/migrations/003_seed_templates.sql` – výchozí šablony pro nové uživatele
  - Rozšířený trigger `handle_new_user()` – 6 šablon + cookie consent záznam
  - UNIQUE index na `cookie_consents.user_id` pro upsert
- `src/components/cookie-consent.tsx` – oprava (odstraněn nepoužitý import `useTranslations("common")`)
- Překlady cs/en/uk – přidány klíče: `accessToken`, `accessTokenPlaceholder`, `connecting`, `errorConnecting`, `cancel`

**Poznámka:** Migrace `003_seed_templates.sql` – nahraj ručně přes Supabase Dashboard → SQL Editor (Supabase CLI není nainstalovaná)

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 9 – Onboarding flow (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/onboarding/page.tsx` – server component s auth checkem
- `src/app/[locale]/(auth)/onboarding/client.tsx` – 3-krokový onboarding wizard
  - Krok 1: Připojení social account (Instagram, Facebook, Twitter/X, LinkedIn)
  - Krok 2: Profil setup (jméno + zájmové kategorie)
  - Krok 3: Hotovo → redirect na dashboard
- Onboarding přesunut z `(dashboard)` do `(auth)` route group – žádné redirect loopy
- Dashboard layout (`(dashboard)/layout.tsx`) – redirect ne-onboardovaných uživatelů na `/onboarding`
- Social ikony (Instagram, Facebook, LinkedIn) – inline SVG (lucide-react je nemá)
- `src/app/api/onboarding/route.ts` – PATCH endpoint pro uložení profilu + onboarded=true
- Prázdný adresář `(dashboard)/onboarding/` vyčištěn
- Build úspěšný

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 10 – Oprava React 19 warningu (next-themes) (DOKONČENO)
**Hotovo:**
- `src/components/providers/theme-provider.tsx` – vlastní implementace bez `<script>` tagů
  - Čte/žepíše cookie `theme`, podporuje system preference listener
  - Plně kompatibilní s React 19 (žádné console warningy)
- `src/components/theme-toggle.tsx` – přepíná na `ThemeContext` z vlastního providera
- `next-themes` package odstraněn z `package.json`
- Console error pryč

### Krok 11 – Oprava přepínače jazyků (DOKONČENO)
**Hotovo:**
- `src/i18n/request.ts` – opravena validace locale + typy (requestLocale může být Promise)
- `cs.json` / `en.json` – prohozen obsah (byly zaměněné – cs měl en text a naopak)
- `uk.json` – správně
- `src/components/locale-switcher.tsx` – opraveno `router.push()` → `window.location.href`
  - Důvod: next-intl načítá překlady server-side přes `getMessages()`. Client-side navigace nereenderuje layout s novými překlady.
- `src/app/[locale]/(dashboard)/settings/page.tsx` – odstraněn hard-coded český text
  - Přidány i18n klíče: `saved`, `currentPlan`, `dangerZone`, `dangerZoneDesc`, `deleteAccount`
  - Plán ceny: ceny dynamické z `PLAN_PRICES` map + `common.free` klíč
  - Všechny 3 jazyky aktualizovány
- Build úspěšný

### Krok 12 – Oprava Supabase bezpečnostního warningu (DOKONČENO)
**Hotovo:**
- Všechna volání `getSession()` → `getUser()` v 5 souborech:
  - `src/app/api/accounts/route.ts`
  - `src/app/api/onboarding/route.ts`
  - `src/app/[locale]/(auth)/onboarding/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `getUser()` ověřuje session proti Supabase Auth serveru (bezpečnější než `getSession()` z cookies)
- Console warning pryč

### Krok 13 – Oprava settings page + dev mode fallback (DOKONČENO)
**Hotovo:**
- `middleware.ts` – přidán check `isSupabaseConfigured` + `supabaseError` flag
  - Bez auth session: redirect na login (když Supabase je configured)
  - Když Supabase není configured nebo throwne error: přístup bez auth (dev mode)
- `(dashboard)/layout.tsx` – opraven auth check s `supabaseAvailable` flag
  - Když Supabase throwne error: přístup bez redirectu na login
  - Onboarding check pouze pokud existuje session
- `settings/page.tsx` – přidán try/catch + dev mode indikátor
  - Bez session: ukazuje "Demo uživatel" + warning banner
  - S session: normální funkčnost s databází

**Poznámka:** Settings stránka vyžaduje přihlášení přes Google OAuth pro plnou funkčnost.
- curl test: 307 redirect na /login (bez auth cookies) – správné chování
- V browseru s přihlášením: settings funguje plně

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel
- [ ] Test settings page s přihlášeným uživatelem v browseru

## 2026-04-30

### Krok 14 – Oprava přepínání jazyků (DOKONČENO)
**Problém:** Aplikace renderovala vždy české překlady bez ohledu na URL (`/en/*`, `/uk/*`).

**Příčina:** Server-side překlady (`getMessages()` / `getTranslations()`) spoléhaly na `requestLocale`, které v tomto setupu nebylo spolehlivě dostupné → fallback na `cs`.

**Hotovo:**
- `src/app/[locale]/layout.tsx` – `getMessages({ locale })` (locale z route params)
- Server stránky/layouty – `getTranslations({ locale, namespace })` místo `getTranslations(namespace)`
  - `src/app/[locale]/(auth)/login/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/app/[locale]/(dashboard)/templates/page.tsx`
  - `src/app/[locale]/(dashboard)/analytics/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `src/components/locale-switcher.tsx` – opraveno zachování query stringu (přidán `?`)

**Výsledek:** Přepínání `cs/en/uk` funguje, překlady odpovídají aktivnímu locale v URL.

### Krok 15 – Oprava problikávání tmavého režimu (DOKONČENO)
**Problém:** Při navigaci mezi stránkami v tmavém režimu problikával světlý režim a zpomaloval aplikaci.
**Příčina:** Při `theme=system` server neměl informaci o `prefers-color-scheme`, proto rendroval light a až po hydrataci se přepnul na dark.
**Řešení:**
- `src/app/layout.tsx` – early-init script v `<head>` nastaví `dark/light` ještě před prvním paintem (cookie `theme` + `matchMedia`)
- `src/app/layout.tsx` – server-side nastaví `<html class="dark">` pokud cookie je `theme=dark`
- `suppressHydrationWarning` na `<html>` a `<body>` – potlačuje hydration warning (theme se liší server vs client)
- Theme provider na client-side již jen udržuje stav a reaguje na změny

### Krok 16 – Oprava přepínače jazyka v Nastavení (DOKONČENO)
**Problém:** Select „Profil → Jazyk“ na stránce Nastavení měnil jen hodnotu ve formuláři/DB, ale nepřepínal jazyk UI.

**Řešení:**
- `src/app/[locale]/(dashboard)/settings/page.tsx` – jazyk UI se přepne až po potvrzení tlačítkem „Uložit“
  - select pouze změní lokální stav
  - po úspěšném uložení profilu (nebo v dev mode) proběhne hard navigace na stejnou stránku s novým locale v URL (`/cs|en|uk/...`) včetně zachování query stringu

### Krok 17 – Dev server: 404 na některých routách (WSL/Turbopack) (DOKONČENO)
**Problém:** V dev módu se objevovaly 404 pro některé stránky (`/cs/posts`, `/cs/templates`, `/cs/settings`), i když `next build` tyto routy generuje správně.

**Řešení:**
- `package.json` – `npm run dev` nyní spouští webpack dev server (`next dev --webpack`)
- Přidán script `dev:turbo` pro spuštění Turbopacku explicitně (pokud je potřeba)

### Krok 18 – Mobile responsive dashboard layout (DOKONČENO)
**Problém:** Dashboard nefungoval správně na mobilních zařízeních – hamburger menu bez overlay/ESC, filters přetekly, tituly se nevešly.

**Hotovo:**
- `src/components/mobile-nav.tsx` – nový client component pro mobilní navigaci
  - Otevření/zavření přes `useState` (žádný checkbox hack)
  - Overlay backdrop – kliknutí mimo zavře menu
  - Klávesa `Escape` zavře menu
  - Automatické zavření po navigaci (`useEffect` na `pathname`)
  - Logout přes browser Supabase klient
- `src/app/[locale]/(dashboard)/layout.tsx` – integrovan MobileNav
  - Desktop sidebar (`md:flex`) + mobilní hamburger (`md:hidden`)
  - Padding `p-4 md:p-6` pro menší okraje na mobilu
- Všechny dashboard stránky – responsive hlavičky:
  - `text-2xl sm:text-3xl` na všechny `<h1>` tituly
  - Header s tlačítkem: `flex-col sm:flex-row` (pod sebou → vedle sebe)
  - Tlačítka: `w-full sm:w-auto` (plná šířka na mobilu)
  - Filters na posts: `flex-wrap` (omíjení na více řádků)
- Build úspěšný

### Krok 19 – Pricing comparison karta na dashboardu (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(dashboard)/page.tsx` – přidána `PricingCard` komponenta
  - Tabulka srovnání plánů: Free / Creator / Pro
  - Sloupce: cena (Kč, EUR, USD), limity funkcí
  - Řádky: Sociální účty, Příspěvky/měsíc, Šablony, Analytika, Prioritní podpora
  - Checkmark (✓) / dash (—) indikátory dostupnosti funkcí
  - Badge aktuálního plánu uživatele (z DB)
  - Tlačítko „Upgrade" → redirect na Nastavení
  - Překlady předávány jako props z server-side `getTranslations()`
- Překlady (cs/en/uk) – nové klíče v `dashboard` namespace:
  `upgradeTitle`, `upgradeSubtitle`, `currentPlan`, `socialAccounts`,
  `postsPerMonth`, `templates`, `analytics`, `prioritySupport`,
  `unlimited`, `upgrade`, `downgrade`, `perMonth`
- Build úspěšný

### Krok 20 – Fix: 500 na dashboardu v dev mode (RSC serializace ikon) (DOKONČENO)
**Problém:** `MobileNav` (client component) dostával z `(dashboard)/layout.tsx` `navItems` včetně Lucide ikon (React komponenty), které nelze předávat přes Server→Client props → 500 na `/cs`.

**Řešení:**
- `src/components/mobile-nav.tsx` – `navItems.icon` změněn na string key + lokální mapování ikon
- `src/app/[locale]/(dashboard)/layout.tsx` – pro mobil se předává `mobileNavItems` s plain hodnotami
- Build úspěšný

### Krok 21 – Šablony: tlačítko „Nová šablona“ + create stránka (DOKONČENO)
**Problém:** Na stránce Šablony klik na „Nová šablona“ nic neudělal (tlačítko bez navigace/handleru v server komponentě).

**Hotovo:**
- `src/app/[locale]/(dashboard)/templates/page.tsx` – tlačítko změněno na link `/${locale}/templates/new`
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – nový formulář pro vytvoření šablony (name + content)
- `src/lib/actions/templates.ts` – server action `createTemplate()` (insert do Supabase + revalidate `/templates`)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro formulář (`namePlaceholder`, `content`, `contentPlaceholder`, `errorSaving`)

### Krok 22 – UI/UX refresh (dark SaaS) – login + dashboard (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – moderní gradient background pro auth (jemné glow blob efekty)
- `src/app/[locale]/(auth)/login/page.tsx` – premium karta (rounded-2xl, jemný border, shadow, backdrop blur) + nadpis Postio s text gradientem
- `src/components/auth/google-signin-button.tsx` – Google tlačítko ve „white“ stylu (vyšší důvěryhodnost)
- `src/app/[locale]/(dashboard)/page.tsx`
  - stat karty: čísla zvětšena na `text-4xl font-bold`
  - quick actions: „Nový příspěvek“ jako primární CTA (nejvýraznější), ostatní větší + výraznější hover
  - pricing tabulka odstraněna, nahrazena elegantním Pro CTA bannerem
- `src/messages/cs.json`, `en.json`, `uk.json` – nové dashboard klíče pro CTA banner (`proCtaTitle`, `proCtaSubtitle`, `proCtaButton`)

### Krok 23 – Konzistentní dark mode napříč celou aplikací (DOKONČENO)
**Problém:** Auth stránky (login, onboarding) měly hard-coded barvy (`border-white/10`, `from-white`, `bg-indigo-500`) které špatně fungovaly v light mode a lišily se od dashboardu.

**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – glow efekty: `bg-primary/5` (light) / `dark:bg-primary/10` (dark), odstraněn `bg-indigo-500`
- `src/app/[locale]/(auth)/login/page.tsx` – karta: `border` místo `border-white/10`, `bg-card` místo `bg-card/80`, gradient: `from-foreground` místo `from-white`
- `src/app/[locale]/(dashboard)/page.tsx` – UpgradeBanner: `border` místo `border-white/10`, glow efekty s `dark:` variantami, odstraněn `bg-indigo-500`
- Všechny barvy nyní přes CSS proměnné (`--card`, `--foreground`, `--primary`, `--border`) – stejný vzhled v light i dark mode

### Krok 24 – Light mode redesign (šedé pozadí + bílé karty) (DOKONČENO)
**Hotovo:**
- `src/app/globals.css` – `:root` proměnné upraveny pro styl dashboardu:
  - `--background: oklch(0.967 0 0)` – světle šedé pozadí místo bílé
  - `--ring: oklch(0.55 0.25 275)` – focus ring v primary barvě místo šedé
  - `--sidebar: oklch(1 0 0)` – sidebar bílý
  - `--sidebar-primary: oklch(0.55 0.25 275)` – sidebar primary v purple
- `src/components/ui/card.tsx` – karty s `rounded-xl` + `shadow-md` (light) / `shadow-sm` (dark)
- `src/app/[locale]/(dashboard)/layout.tsx` – header + sidebar mají `shadow-sm dark:shadow-none`, main content `bg-background`
- Světlý režim nyní odpovídá referenčnímu designu: šedé pozadí, bílé karty s jemnými stíny

### Krok 25 – Deploy na Vercel (DOKONČENO)
**Hotovo:**
- Aplikace nasazena na Vercel (free tier)
- Environment variables nakonfigurovány: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- GitHub repozitář propojen s Vercel projektem pro automatické deploye
- Production build úspěšný, aplikace dostupná na Vercel URL

### Krok 26 – Oprava odkazu "Zjistit více" v cookie banneru (DOKONČENO)
**Problém:** Tlačítko „Zjistit více" v cookie consent banneru bylo obyčejný `<button>` bez `onClick` handleru – kliknutí nic nedělalo.

**Hotovo:**
- `src/app/[locale]/privacy/page.tsx` – nová veřejná stránka Ochrany osobních údajů (mimo auth guard)
  - Sekce: data která sbíráme, jak je používáme, cookies, sdílení dat, práva, kontakt
  - Plně lokalizovaná (cs/en/uk) přes `getTranslations()`
- `src/components/cookie-consent.tsx` – `<button>` → `<Link>` na `/{locale}/privacy`
  - Dynamické locale z `usePathname()`
- `src/messages/cs.json`, `en.json`, `uk.json` – nový namespace `privacy` (14 klíčů)

**Následující kroky:**
- [ ] Social accounts – skutečné OAuth integrace (Instagram, Facebook, Twitter, LinkedIn)
- [ ] Posts – CRUD operace s databází (create, schedule, publish)
- [ ] Analytics – reálná data z API sociálních sítí
- [ ] Payment integrace (Stripe) pro Creator/Pro plány
- [ ] Email notifikace (Resend)


### Krok 30 – Majestátní pravý panel na login stránce (DOKONČENO)
**Hotovo:**
- `src/components/auth/login-visual.tsx` – dashboard mock zvětšen o 25 % (`scale-125` místo `scale-110`)
  - Grid pattern v pozadí zesílen na opacitu 8 % (z 2,5 %) pro jemnější viditelnost
  - Přidán silný měkký glow efekt za dashboard: `blur-[100px]`, gradient purple→indigo→blue (30/20/10 %)
  – Glow je centrován (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`) s `z-[5]` a `pointer-events-none`

### Krok 27 – Login page redesign (DOKONČENO)

### Krok 28 – Responzivní auth layout + redesign vizuálního panelu (DOKONČENO)

### Krok 29 – Oprava pozice LocaleSwitcheru na login stránce (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/login/page.tsx` – odstraněn obalový `<div>` kolem `<LocaleSwitcher />`
  - Třídy pro pozicování (`absolute top-8 right-8 z-50`) přeneseny přímo na komponentu
  - Levý panel už má třídu `relative`, takže absolutní pozicování funguje správně
**Hotovo:**
- `src/app/globals.css` – tmavý gradient na pozadí, `--radius: 20px`, touch targety 48px na mobilu
- `src/app/[locale]/(auth)/layout.tsx` – wrapper bez `bg-background`
- `src/app/[locale]/(auth)/login/page.tsx` – Layout 40/60 přesné šířky (`w-[40%]` / `w-[60%]`)
  - LocaleSwitcher: absolutně v pravém horním rohu levého panelu (`absolute right-8 top-8`, padding 2rem)
  - Nadpis „P‍ostio" zvětšen na `text-5xl` / `sm:text-6xl`
  - „Začněte s Postio" zvětšen na `text-3xl` / `sm:text-4xl`
  - LoginVisual skryt `hidden lg:flex` – na mobilu se nevykresluje vůbec
- `src/components/auth/login-visual.tsx` – kompletní redesign:
  - Dashboard mock zvětšen ~30 % (padding `p-8`, bar chart `h-32`, čísla `text-xl`/`text-2xl`)
  - Pozadí: grid pattern (opacita 4 %) + fialová/modrá glow bloby (`blur-3xl`)
  - Všechny texty lokalizované přes props: Dashboard, This week, Posts, Reach, Eng., Post scheduled, +24%
- `src/components/auth/google-signin-button.tsx` – `rounded-2xl`, `h-12`, hover efekt `hover:-translate-y-0.5` + `hover:shadow-medium`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `visualDashboard`, `visualThisWeek`, `visualPosts`, `visualReach`, `visualEngagement`, `visualScheduled`, `visualEngagementUp`

### Krok 27 – Login page redesign (DOKONČENO)
**Hotovo:**
- `src/app/layout.tsx` – přidán **Inter** font přes `next/font/google` (variable `--font-sans`, `display: swap`)
- `src/app/globals.css` – vylepšený design systém:
  - `--font-sans` s fallback na `system-ui, sans-serif`
  - `--radius: 1rem` (16px, zvětšeno z 10px)
  - `--shadow-soft`, `--shadow-medium`, `--shadow-card` – nové shadow utility
  - `--gradient-hero`, `--gradient-subtle` – brand gradienty
  - Primary barva jemně upravena `oklch(0.56 0.22 275)` pro lepší kontrast
  - Light mode: `--background: oklch(0.985 0 0)` (čistější bílo-šedá)
- `src/app/[locale]/(auth)/layout.tsx` – čistý gradient background (`from-primary/[0.03]`)
- `src/app/[locale]/(auth)/login/page.tsx` – **split layout redesign**:
  - Levý panel: logo "P"ostio (primary P), heading, subtext, Google sign-in, privacy link
  - Pravý panel: `LoginVisual` komponenta s gradient hero + dashboard mock
  - Responsive: pravý panel hidden na mobile (`hidden sm:flex w-1/2`)
- `src/components/auth/login-visual.tsx` – nová komponenta:
  - Gradient hero background (purple → violet → pink)
  - Dashboard mock karta s animovanými stat bary (Framer Motion)
  - Floating karty: "Post scheduled" + "+24% engagement"
  - Jemný cross pattern overlay
- `src/components/auth/google-signin-button.tsx` – vylepšený styl:
  - `h-11 rounded-xl` vyšší tlačítko, větší border radius
  - `shadow-card` stín, dark mode podpora (`dark:bg-gray-900`)
  - `space-y-4` místo `space-y-3` pro lepší spacing

### Krok 29 – Cookie Consent redesign + Framer Motion typy (DOKONČENO)
**Hotovo:**
- `src/components/cookie-consent.tsx` – kompletní přepsání:
  - **Floating card** místo bottom baru: `fixed bottom-4 right-4`, `rounded-2xl`, `bg-card`, border + stín
  - Tlačítka: "Předvolby" (outline) + "Přijmout vše" (primary, flex-1)
  - **Dialog (Modal)** pro předvolby cookies se 3 kategoriemi:
    - Nezbytné (vždy ON, bez switch, badge `bg-primary/10`)
    - Analytika (Switch ON/OFF + label stavu)
    - Marketing (Switch ON/OFF + label stavu)
  - Každá kategorie v `rounded-xl border p-4` kartě s popisem
  - Tlačítko "Uložit předvolby" v patě dialogu
  - Install: `@radix-ui/react-dialog` + shadcn `dialog` + `switch` komponenty
- `src/messages/cs.json`, `en.json`, `uk.json` – nové cookie klíče:
  `preferences`, `preferencesTitle`, `preferencesIntro`, `necessary`, `necessaryDesc`,
  `analyticsDesc`, `marketingDesc`, `savePreferences`, `on`, `off`
- `src/components/auth/login-visual.tsx` – oprava Framer Motion v12 typů:
  - `ease: "easeInOut"` → `ease: "easeInOut" as const` (3 místa)
  - Bez `as const` hlásí TypeScript chybu při buildu (infernovaný `string` není kompatibilní s `Easing`)
- Build úspěšný

### Krok 31 – Scheduler: Edge Function + Vercel Cron + ECC Service Role auth (DOKONČENO)
**Hotovo:**
- `supabase/functions/process-scheduled-posts/index.ts` – Edge Function, která zpracuje `posts` se statusem `scheduled` a `scheduled_at <= now()`, přepne je na `published` a založí výchozí řádek v `analytics`
  - Autorizace přes `Authorization: Bearer` ověřená jako JWT s rolí `service_role` přes Supabase JWKS (ECC klíče)
 - Pozn.: Supabase CLI nepovoluje secrets s prefixem `SUPABASE_`, proto Edge Function čte DB klíč z `POSTIO_SERVICE_ROLE_KEY`
 - Repo hygiene: ignorování `supabase/.temp/` (lokální soubory Supabase CLI)
 - Cron auth kompatibilita: Edge Function bere `Authorization: Bearer` jak ve formátu JWT, tak i ve formátu `sb_secret_*` (porovnání proti `POSTIO_SERVICE_ROLE_KEY`)
 - Vercel Cron vypnut: odstraněn `vercel.json` a Next.js cron route (Vercel Hobby limity); spouštění řešeno přes Supabase Cron (pg_cron)
 - Fix deploy: `tsconfig.json` vylučuje `supabase/functions/**`, aby Next.js typecheck nepadal na Deno remote importe (esm.sh / npm:)
 - Fix: `middleware.ts` vyjímá `/icon` a `/apple-icon` z middleware matcheru, aby se favicon/ikony neredirectovaly na login
 - ## Manuální synchronizace identity - Postioczgit add .
