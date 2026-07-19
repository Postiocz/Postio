# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🔧 Feat - Identifikační údaje provozovatele v právních dokumentech (UK, Krok 3 – dokončeno)

- **Kontext**: Poslední mutace (uk). Dokončuje doplnění identifikace OSVČ provozovatele do všech 3 jazyků právních dokumentů.
- **Změny (doc/uk)**: `01_...` sekce 2 КОНТРОЛЕР – Václav Nykl + Ідентифікаційний номер (IČO) + Юридична адреса (3 řádky). `02_...` bod 1.1 – identifikace provozovatele. `03_...` bod 1.1 – identifikace Обробника. `04_...` bod 1 ВСТУП – jméno+IČO+sídlo v závorce.
- **Poznámka**: Terminologie „Ідентифікаційний номер (IČO)" / „Юридична адреса"; jméno a adresa latinkou v originále + „Чехія". Celý úkol (cs/en/uk) tímto hotový.
- **Upravené soubory**: doc/uk/01–04 (4 soubory).

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

### 🔧 Feat - Překlady právních stránek EN/UK (Prompt 033, Krok 5)

- **Kontext**: Krok 4 parsuje cs; rozhodnutí B původně "cs zdroj pro en/uk", uživatel změnil na vygenerování strojových překladů (konceptů).
- **Změny**: `src/lib/legal-docs.ts` - `readLegalDoc(fileName, locale)` hledá postupně `doc/{locale}/{fileName}`, pak cs zálohu `doc/{fileName}`. `src/components/marketing/legal-doc-page.tsx` - lokalizovaný popisek data (cs/en/uk), regex data podporuje 3 jazyky, regex `h2` rozšířen o cyrilici (`А-ЯЄІЇҐ`). 4 soubory v `doc/en/` (01-04) + 4 v `doc/uk/` (01-04), stejné názvy jako cs, zrcadlící strukturu (POSTIO / název / URL|email / "Last updated" resp. "Останнє оновлення" / číslované sekce / `* ` odrážky).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0); smoke test parseru na ukrajinském souboru (nadpis, datum i bloky OK); manuální test ✅ (8 routů en/uk načítá překlad).
- **Poznámka**: EN/UK jsou strojové překlady – před produkcí nutná právní kontrola.
- **Upravené soubory**: legal-docs.ts, legal-doc-page.tsx, doc/en/* (4 nové), doc/uk/* (4 nové).

### 🔧 Feat - Formátování právních rout (Prompt 033, Krok 4)

- **Kontext**: Krok 3 přidal 4 routy zobrazující .txt raw (`whitespace-pre-line`). Chybělo strukturované formátování (nadpisy, odrážky, datum).
- **Změny**: `src/components/marketing/legal-doc-page.tsx` - NOVÁ `parseLegalDoc(raw)`: extrahuje název (řádek pod `POSTIO`) → `<h1>` a `Naposledy aktualizováno: <datum>` → podtitulek; tělo (od první číslované sekce) parsuje na bloky: top-level `N.` → `<h2>`, sub-level `N.N` → `<h3>` (inline text oddělen do `<p>`), `* ` → odrážka (seskupeno do `<ul>`), ostatní → `<p>`. Duplicitní název+datum pod hlavičkou přeskočeno. Stylování `max-w-3xl`, black bg, bílá nadpisy - konzistentní s `/privacy`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0), manuální test ✅ (4 routy: název+datum v hlavičce, sekce jako nadpisy, odrážky jako seznam; cs/en/uk přes LocaleSwitcher).
- **Poznámka**: `04_...AI.txt` má řádek 17 slitou tabulku (bez oddělovačů) → vykreslena jako odstavec (parsování tabulek mimo rozsah Krok 4).
- **Upravené soubory**: legal-doc-page.tsx.

### 🔧 Feat - Právní routy (Prompt 033, Krok 3)

- **Kontext**: Footer odkazuje na `/privacy-policy`, `/terms-of-service`, `/dpa`, `/ai-transparency-notice`, ale tyto routy neexistovaly - klik na ně vedl na 404.
- **Změny**: `src/lib/legal-docs.ts` - NOVÝ reader (`fs/promises`, Node runtime, čte `doc/*.txt` přes `process.cwd()`). `src/components/marketing/legal-doc-page.tsx` - NOVÁ sdílená server komponenta (hlavička s Logem = odkaz domů jako `/privacy`, tělo dokumentu raw `whitespace-pre-line`, `<SiteFooter locale={locale} />`, tlačítko Zpět). 4 routy pod `(marketing)`: `privacy-policy`, `terms-of-service`, `dpa`, `ai-transparency-notice` (`page.tsx`), každá volá `LegalDocPage` s příslušným souborem a `runtime = "nodejs"`. Middleware: routy veřejné automaticky (nejsou `isDashboardRoute`), žádná změna.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0), manuální test ✅ (4 routy načítají text dokumentu, hlavička + footer + LocaleSwitcher funkční; cs/en/uk).
- **Poznámka**: Krok 4 přidal parser (h2/odrážky/datum) do `legal-doc-page.tsx`; `.txt` soubory v `doc/` musejí zůstat (čtou se za běhu).
- **Upravené soubory**: legal-docs.ts (nová), legal-doc-page.tsx (nová), privacy-policy/page.tsx (nová), terms-of-service/page.tsx (nová), dpa/page.tsx (nová), ai-transparency-notice/page.tsx (nová).

### 🔧 Feat - Footer (SiteFooter) + cookie modal reopen (Prompt 033, Krok 1)

- **Kontext**: Marketing web neměl profesionální patičku se sloupci odkazů. Existující `site-footer.tsx` měl jen newsletter kartu + jednoduchou lištu.
- **Změny**: `src/components/marketing/site-footer.tsx` - přepsáno na 4 sloupce (Produkt, Podpora, Právní & GDPR, Aplikace) + zachovaná newsletter karta nahoře + spodní řádek (Logo + © + tagline | "Vytvořeno s ❤️ v ČR" | LocaleSwitcher). Odkazy `#A89FFF` → hover `#6C47FF`, nadpisy uppercase bílé, horní ohraničení `border-white/10`. `src/components/marketing/cookie-settings-link.tsx` - NOVÁ client komponenta (tlačítko dispečující `postio:open-cookie-settings`). `src/components/cookie-consent.tsx` - preferences Dialog nyní vždy namountovaný a naslouchá na uvedený event, takže "Nastavení cookies" otevře modal i po uložení souhlasu. `src/messages/{cs,en,uk}.json` - NOVÝ top-level namespace `footer`.
- **Ověření**: `npx tsc --noEmit` ✅, JSON platné, manuální test ✅ (cs/en/uk, Light i Dark, cookie modal + LocaleSwitcher funkční; opraven duplicitní React klíč v APLIKACE sloupci).
- **Upravené soubory**: site-footer.tsx, cookie-settings-link.tsx (nová), cookie-consent.tsx, cs.json, en.json, uk.json.

### 🔧 Fix - Čitelnost mobilní navigace v Light mode (MIMO ARCHIVU – prořezáno Pravidlem 6)


