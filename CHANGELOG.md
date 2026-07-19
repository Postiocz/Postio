# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🔧 Fix - Mobilní patička do 2 sloupců (MIMO ARCHIVU – prořezáno Pravidlem 6)

### 🔧 Feat - Identifikační údaje provozovatele v právních dokumentech (UK, Krok 3 – MIMO ARCHIVU, prořezáno Pravidlem 6)

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

