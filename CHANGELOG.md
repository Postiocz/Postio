# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🚀 Prompt 035 – KROK 1: Výchozí měna přepínače podle locale ✅

- **Kontext**: `CurrencySwitcher` existoval, ale v `billing-client.tsx` i `pricing-client.tsx` byl default natvrdo `"eur"` → český uživatel viděl EUR místo CZK.
- **Změna**: `src/lib/pricing.ts` – NOVÝ helper `getDefaultCurrency(locale)` (`cs`→`czk`, jinak→`eur`). Obě client komponenty volají `useState(getDefaultCurrency(locale))` místo `"eur"`.
- **Poznámka**: Krok 2 (typografie) z většiny hotov (serif na Landing, sans v app, Pravidlo 8 splněno). Free label zůstává hardcodovaný `"Free"` → řeší Krok 5 (lokalizace).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální test ✅ (cs→CZK, en/uk→EUR, přepínání částek OK).
- **Upravené soubory**: pricing.ts, billing-client.tsx, pricing-client.tsx, ukol.md, CHANGELOG.md.

### 🔧 Fix - Instagram připojení má vlastní selektor (neotvírá FB Page modál)

- **Kontext**: Klik na tlačítko Instagram otevíral stejný modál jako Facebook (výběr FB stránek) a nenacházel IG účet. Příčina: IG flow volal `signInWithOAuth(provider:"facebook")` a callback ukládal IG přes `/me/accounts` (FB stránky) jako `is_active:true` + signál `?fb=connected` → otevřel FB selektor. IG účet uživatele (propojený s FB, ale ne přes Page) se nenašel.
- **Změna**:
  - `callback/route.ts` – Instagram větev (`requestedPlatform==="instagram"`) nyní ukládá nalezené IG účty (z `/me`, `/me/instagram_business_account` i z FB stránek) jako **`is_active:false`** do `social_accounts` a na konec přidává signál **`?ig=connected`** (místo `?fb=connected`). Zrušena auto-aktivace IG během OAuth (žere slot Free plánu).
  - `accounts/page.tsx` – přidán načítací efekt `fetchPendingIgAccounts` (GET `/api/accounts/instagram/select`), signál `?ig=connected` otevírá nový `InstagramAccountSelector`, sekce "Nalezené Instagram účty" s avatary. IG scopes rozšířeny o `pages_show_list,pages_read_engagement,pages_manage_posts` (aby se našly i IG přes FB stránku).
  - NOVÁ `src/app/api/accounts/instagram/select/route.ts` – vrací neaktivní IG účty (jako `facebook/select`).
  - NOVÁ `src/components/instagram-account-selector.tsx` – glassmorphism dialog "Zaškrtněte IG účty" (kopie FB Page selectoru, růžová varianta), tlačítko "Připojit" volá `toggleAccountActive(id,true)`.
  - i18n: přidány klíče `pendingIgTitle/Subtitle/manageIgButton/noIgFound/igSelector*` do cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0).
- **Upravené soubory**: callback/route.ts, accounts/page.tsx, instagram/select/route.ts (nová), instagram-account-selector.tsx (nová), cs.json, en.json, uk.json, CHANGELOG.md.

### 🔧 Fix - Smyčka v modálu Facebook stránek (auto-aktivace Instagramu blokovala výběr Page)

- **Kontext**: Po přechodu na produkční doménu se při propojení Facebooku otevřel modál výběru stránek (Pages), ale po kliknutí na "Uložit"/aktivaci se modál znovu objevil a FB účet se nepřidal. Podezření na NULL `account_id` bylo mylné (sloupec `account_id` existuje jen v `post_platforms`, ne v `social_accounts`).
- **Root cause**: V `src/app/auth/callback/route.ts` se při Facebook flow pro každou stránku s propojeným IG business accountem **automaticky ukládal Instagram s `is_active: true`**. Na Free plánu (limit = 1) to sežralo jediný slot ještě během OAuth, takže následná aktivace FB stránky v modálu selhala na limitu (`toggleAccountActive` → `accountLimitErrorMessage`), selector udělal optimistic revert a stránka se vrátila → vypadalo to jako smyčka. Navíc callback na začátku deaktivuje všechny FB řádky, proto "zmizely" staré účty.
- **Změna**: `src/app/auth/callback/route.ts` (blok IG nalezeného přes FB stránku, ~ř. 728) – `is_active: true` → `is_active: false` (uložen neaktivní, stejně jako Pages). Instagram se připojuje zvlášť přes IG tlačítko (samostatný Direct Login branch, `is_active: true`). Samostatný Instagram Direct Login branch (ř. 607) a YouTube zůstávají `is_active: true`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Konzistence: `facebook/select` filtruje jen `platform='facebook'`, takže neaktivní IG se neobjeví v pending seznamu (žádoucí).
- **Upravené soubory**: callback/route.ts, CHANGELOG.md.

### 🔧 Fix - Instagram se nepřipojoval samostatně (platform hint v top-level query param)

- **Kontext**: Po kliku na tlačítko Instagram se otevřel Facebook OAuth, ale po odkliknutí se IG nepřidal (znovu se nabídl Facebook). Ostatní platformy (FB, YouTube, LinkedIn, X, TikTok) fungovaly.
- **Root cause**: IG handler v `accounts/page.tsx:893` posílá `platform=instagram` jako **top-level** query param (`.../auth/callback?next=...&platform=instagram`), ale `auth/callback/route.ts` hledal `platform` **uvnitř** `next` parametru (tj. `/cs/accounts?platform=instagram`). `next` je ale pouhá lokální cesta bez query, takže `requestedPlatform` byl vždy `null` → IG Direct Login branch (route.ts ~ř. 546) se nikdy nespustil → IG se neuložil. Facebook branch ("Always fetch Facebook Pages") běží vždy bez tohoto flagu, proto fungoval.
- **Změna**: `src/app/auth/callback/route.ts` – detekce `platform` teď čte `requestUrl.searchParams.get("platform")` z top-level URL (zpětně kompatibilní s legacy formou uvnitř `next`).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). `normalizeNext` nemění `next` (lokální cesta), takže top-level `platform` přežije.
- **Upravené soubory**: callback/route.ts, CHANGELOG.md.

### 🔧 Fix - Normalizace URL (odstranění dvojitého lomítka `//auth`, `//api`)

- **Kontext**: Na ostré doméně `https://postio-app.cz` vznikaly návratové adresy s dvěma lomítky (např. `https://postio-app.cz//auth/callback`), pokud `NEXT_PUBLIC_APP_URL` končil lomítkem. To rozbilo YouTube i TikTok OAuth callback.
- **Změny**: `src/lib/actions/auth.ts` – `emailAuthAction` i `resetPasswordAction` nyní skládají návratovou adresu přes `new URL(path, baseUrl)` (normalizuje lomítka) místo `\`${baseUrl}/auth/callback\``. `src/lib/email.ts` – `getAppBaseUrl()` nově garantuje `base` bez trailing slashe (`base.replace(/\/+$/, "")`). `src/components/auth/google-signin-button.tsx` – stejný vzor `new URL("/auth/callback", baseUrl)`. `src/app/auth/callback/route.ts` neměněn (používá `request.url`/`url.origin`, což nikdy nemá trailing slash).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální kontrola: `new URL("/auth/callback", "https://postio-app.cz/")` → `https://postio-app.cz/auth/callback` (jedno lomítko).
- **Upravené soubory**: auth.ts, email.ts, google-signin-button.tsx, CHANGELOG.md.

### 🚀 Feat - Sitemap + Robots (Prompt 032 KROK 5) ✅ – celý Prompt 032 hotový

- **Kontext**: Poslední krok přestěhování na postio-app.cz – umožnit Google indexaci (FÁZE 1 plánu).
- **Změny**: `src/app/sitemap.ts` (NOVÁ) - dynamická MetadataRoute.Sitemap, 15 URL (3 locale cs/en/uk × 5 cest: Landing + privacy-policy/terms-of-service/dpa/ai-transparency-notice), changeFrequency + priority (Landing 1.0, právní 0.6), lastModified. `src/app/robots.ts` (NOVÁ) - `allow: "/"` pro `*`, odkaz na `/sitemap.xml` + host postio-app.cz. Auth/dashboard routy záměrně vynechány.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální test ✅ (kód v pořádku).
- **Poznámka**: Tímto uzavřen celý Prompt 032 (Krok 1–5). Sekce úkolu smazána z ukol.md (Pravidlo 7).
- **Upravené soubory**: sitemap.ts (nová), robots.ts (nová), ukol.md, CHANGELOG.md.

### 🔧 Feat - Příprava e-mailové infrastruktury (Resend) – Prompt 032 KROK 4 ✅

- **Kontext**: Příprava na odesílání transakčních e-mailů z info@postio-app.cz (potvrzení registrace, reset hesla) přes Resend.
- **Změny**: `package.json`/`package-lock.json` - přidána závislost `resend@^4.8.0`. `src/lib/email.ts` (NOVÁ) - `sendTransactionalEmail()` (vrací {success,id?,error?}, nehází), `getFromEmail()` (POSTIO_FROM_EMAIL, fallback info@postio-app.cz), `isEmailConfigured()` (RESEND_API_KEY), `getAppBaseUrl()` (z hlaviček / NEXT_PUBLIC_APP_URL). `src/messages/{cs,en,uk}.json` - NOVÝ namespace `email` (welcome, passwordReset + fromName/fromAddress).
- **Bod 3 (Supabase Auth odesílatel)**: řeší se v Supabase konzoli (Auth → URL Configuration + custom šablony), ne v kódu; auth.ts už používá NEXT_PUBLIC_APP_URL. Uživatel volil Možnost C: manuální ověření Resend + DNS u Forpsi proběhne mimo kód.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0); JSON platné; `npm install resend` ✅. Manuální test ✅ (technická příprava).
- **Upravené soubory**: email.ts (nová), cs.json, en.json, uk.json, package.json, package-lock.json, ukol.md, CHANGELOG.md.

### 🚀 Prompt 032 – KROK 2 (SEO/Meta) + KROK 3 (Dynamické adresy) ✅

- **Kontext**: Příprava na produkci postio-app.cz. Uživatel změnil ve Vercelu NEXT_PUBLIC_APP_URL a přidal TikTok Redirect URI na novou doménu.
- **KROK 3**: `src/app/api/accounts/tiktok/route.ts:10` - `TIKTOK_REDIRECT_URI` `postio-alpha.vercel.app` → `https://postio-app.cz/api/accounts/tiktok` (respektuje striktní výjimku z CLAUDE.md). Kontrola `src/`: žádné další `postio-alpha`; X/LinkedIn/Google/YouTube dynamické přes `${url.origin}`, Stripe/auth přes `NEXT_PUBLIC_APP_URL`.
- **KROK 2**: `src/app/layout.tsx` - NOVÝ `export const metadata`: `metadataBase` = postio-app.cz, `title` (default + `%s | Postio` template), `description`, `openGraph` (website, og:image `/hero-mockup_cs.png` 1200×630), `twitter` card `summary_large_image`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0); manuální test ✅ (metadata i dynamické adresy v pořádku).
- **Poznámka**: OG obrázek zatím reuse `hero-mockup_cs.png`; dedikovaný `og-image.png` možno dodělat později.
- **Upravené soubory**: tiktok/route.ts, layout.tsx, ukol.md, CHANGELOG.md.

### 🚀 Prompt 032 – Příprava na produkční nasazení (postio-app.cz): FÁZE 1 – Plán + Audit ENV (Krok 1)

- **Kontext**: Projekt stabilizovaný, cíl přestěhování z `postio-alpha.vercel.app` na `postio-app.cz`. FÁZE 1 = pouze analýza a zápis plánu do `ukol.md`, žádný kód.
- **Změny**: `ukol.md` – pod sekci ## 10. AKTUÁLNÍ ÚKOLY přidán úkol "Prompt 032" s 5 kroky (1 Audit ENV, 2 SEO/Meta, 3 Dynamické adresy, 4 E-mail, 5 Sitemap/Robots). KROK 1 označen ✅.
- **Audit (výstup Kroku 1)**: `NEXT_PUBLIC_APP_URL` → `https://postio-app.cz`. TikTok má hardcoded `TIKTOK_REDIRECT_URI` (`src/app/api/accounts/tiktok/route.ts:10`) na `postio-alpha.vercel.app`; X/LinkedIn/Google/YouTube používají dynamické `${url.origin}`. Stripe: přepnout `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_CREATOR/PRO` na Live + live webhook endpoint.
- **Ověření**: Manuální analýza kódu (grep process.env + hardcoded URL). Žádný kód nezměněn.
- **Upravené soubory**: ukol.md, CHANGELOG.md.

### 🔧 Feat - Identifikační údaje provozovatele v právních dokumentech (EN, Krok 2)

- **Kontext**: Navazuje na Krok 1 (cs). EN mutace potřebovaly stejnou identifikaci OSVČ provozovatele.
- **Změny (doc/en)**: `01_...` sekce 2 DATA CONTROLLER – Václav Nykl + ID Number (IČO) + Registered Office (3 řádky). `02_...` bod 1.1 – identifikace provozovatele. `03_...` bod 1.1 – identifikace Processoru. `04_...` bod 1 INTRODUCTION – jméno+IČO+sídlo v závorce.
- **Poznámka**: Terminologie „ID Number (IČO)" / „Registered Office"; adresa v originále + „Czech Republic". UK (Krok 3) zbývá.
- **Upravené soubory**: doc/en/01–04 (4 soubory).

### 🔧 Feat - Identifikační údaje provozovatele v právních dokumentech (CS, Krok 1)

- **Kontext**: Právní dokumenty (Privacy, Terms, DPA, AI Notice) neobsahovaly identifikaci OSVČ provozovatele (Václav Nykl, IČO 74260138, sídlo Sokolská 464/27, Nové Město, 12000 Praha 2, Česko).
- **Změny (doc/cs)**: `01_...Zasady...` sekce 2 SPRÁVCE – doplněno jméno + IČO + sídlo (3 řádky). `02_...Obchodni_podminky` bod 1.1 – identifikace provozovatele. `03_...DPA` bod 1.1 – identifikace Zpracovatele. `04_...AI` bod 1 ÚVOD – jméno+IČO+sídlo v závorce.
- **Poznámka**: Vlastní jméno/adresa s diakritikou; ostatní popisky ve stylu souboru (bez diakritiky). Diakritika/spisovnost v tělech dokumentů opraví uživatel ručně, poté Claude zkontroluje formátování před EN/UK. EN (Krok 2) a UK (Krok 3) zatím neprovedeny.
- **Upravené soubory**: doc/cs/01–04 (4 soubory).

### 🔧 Fix - Light režim na právních stránkách

- **Kontext**: Stránky `/privacy-policy`, `/terms-of-service`, `/dpa`, `/ai-transparency-notice` měly v `LegalDocPage` natvrdo `bg-black` a `text-white` → v Light mode bílý text na bílém pozadí (neviditelné).
- **Změny**: `src/components/marketing/legal-doc-page.tsx` - hlava i kontejner `bg-black` → `bg-background`; nadpisy `text-white` → `text-foreground`; orámování `border-white/10` → `border-border`; tlačítko Zpět `bg-white/5`/`border-white/10` → `bg-muted/50`/`border-border` (s hover `hover:bg-muted`/`hover:border-foreground/20`); odrážky `text-muted-foreground` → `text-foreground/80`. Logo používá `text-foreground` (již OK). Oprava v sdílené komponentě pokrývá všechny 4 routy najednou.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0).
- **Upravené soubory**: legal-doc-page.tsx.

