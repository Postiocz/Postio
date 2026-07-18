# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🔧 Fix - Čitelnost mobilní navigace v Light mode (Mimořádný úkol, Krok 1)

- **Kontext**: Spodní mobilní navigace měla pozadí `bg-black/60` bez `dark:` varianty a neaktivní položky `text-zinc-500` - v Light mode šedý text/ikony na poloprůhledné černé liště = špatný kontrast, prakticky nečitelné.
- **Změny**: `src/components/dashboard/mobile-nav.tsx` - lišta: `bg-black/60 border-t border-white/10` → `bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10` (adaptivní). Barvy položek (nav items i settings trigger): `text-indigo-500`/`text-zinc-500` → `text-indigo-600 dark:text-indigo-400` (aktivní) a `text-slate-600 dark:text-zinc-400` (neaktivní). Glow `drop-shadow` u aktivní položky zachován.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0), manuální test ✅ (Light i Dark mode: ikony i popisky čitelné, aktivní indigo).
- **Upravené soubory**: mobile-nav.tsx.

### 🔧 Feat - Referral "Jak to funguje": mobilní accordion + desktop původní (Mimořádný úkol)

- **Kontext**: Na mobilu působila sekce "Jak to funguje" nekonzistentně (kroky centrované, zabíraly zbytečně mnoho vertikálního místa). Požadavek: na desktopu zachovat původní vzhled (4 karty vedle sebe, centrované), na mobilu sekci sbalit pod rozbalovací nadpis.
- **Změny**: `src/components/referral/referral-stats.tsx` - BOTTOM sekce "Jak to funguje" přepsána: nadpis `howItWorks` (`h2`) + `ChevronDown` v `<button>` vpravo (flex `justify-between`, šipka `sm:hidden`). `useState(open)` (výchozí `false` = na mobilu sbaleno); klik toggluje `open`, šipka rotuje `rotate-180` (`transition-transform duration-300 motion-reduce:transition-none`). Grid karet: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; display třída `${open ? "grid" : "hidden"} sm:grid` (mobil sbalitelné, desktop vždy grid). Karta kroku: mobil `flex flex-row items-start gap-4 text-left` (číslo vlevo, textový blok vpravo, kolečko `shrink-0`), desktop `sm:flex-col sm:items-center sm:text-center` (původní vzhled 4 karet). Přidán import `ChevronDown` z lucide-react. Zachováno: radius 20px, pastel badge, `prefers-reduced-motion`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální test: desktop = původní 4 karty centrované (šipka skrytá); mobil = nadpis + šipka, obsah skrytý, po kliku 4 kompaktní řádky (číslo vlevo, text doleva), šipka se otočí.
- **Poznámka**: Hlavička stránky "Doporučení" ponechána beze změny (centrovaná na mobilu dle dřívějšího schválení).
- **Upravené soubory**: referral-stats.tsx.

### 🎯 Feat - Referral: UI stránka + lokalizace (Prompt 034, Krok 3+4)

- **Kontext**: Krok 2 přidal menu + prázdnou routu. Chyběla plná UI stránky (statistiky, odkaz, Jak to funguje) a překlady cs/en/uk. Od uživatele schválena Varianta 1 (pouze vizuální zobrazení odměn).
- **Změny**: `src/components/referral/referral-stats.tsx` - NOVÁ client komponenta (framer-motion, sonner toast). TOP: dvě glass karty (Celkem doporučení / Získané odměny + "Měsíce PRO tarifu zdarma"), obojí = `count(referred_by)`. MIDDLE: read-only input s odkazem + tlačítko Kopírovat (`navigator.clipboard`, ikona přepne na fajfku, `toast.success`). BOTTOM: "Jak to funguje" `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, 4 kroky s číslovanými pastel badge (indigo/purple/pink/emerald) + glow, text-center/items-center. Design: radius 20px, glassmorphism, `useReducedMotion()` (prefers-reduced-motion), žádný em-dash. `src/app/[locale](dashboard)/settings/referrals/page.tsx` - přepsáno na server wrapper (načte `referral_code` + `count(referred_by)`, předá do `ReferralStats`); hlavní nadpis zarovnán na střed (mobil) / vlevo (desktop). `src/messages/{cs,en,uk}.json` - NOVÝ top-level namespace `referrals` (14 klíčů: totalReferrals, rewardsEarned, rewardsSub, yourLink, copy, copied, copyError, howItWorks, step1-4); osamocené `yourLink`/`totalReferrals` přesunuty z `settings`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0), JSON zprávy platné, manuální test ✅ (kopírování, animace, překlady cs/en/uk).
- **Poznámka**: Odměny čistě vizuální (Varianta 1) - žádné reálné přidělování PRO / Stripe.
- **Upravené soubory**: referral-stats.tsx (nová), referrals/page.tsx, cs.json, en.json, uk.json.

### 🎯 Feat - Referral: položka menu + routa (Prompt 034, Krok 2)

- **Kontext**: Krok 1 uložil `referral_code`/`referred_by` a zachytil `?ref=`. Chyběla navigace a stránka pro zobrazení doporučení.
- **Změny**: `src/components/dashboard/sidebar.tsx` - položka `Doporučení` (ikona `Gift`) v submenu sekce Účet + `referrals` v typu `settingsLabels`. `src/components/dashboard/mobile-nav.tsx` - stejná položka v mobilním dropdownu (sekce Účet) + typ. `src/components/dashboard/mobile-nav-wrapper.tsx` - `referrals` v typu. `src/app/[locale](dashboard)/layout.tsx` - předal `referrals: settingsT("referrals")` do `Sidebar` i `MobileNavWrapper`. `src/messages/{cs,en,uk}.json` - klíče `referrals`, `referralsDescription`, `yourLink`, `totalReferrals` (namespace `settings`). `src/app/[locale](dashboard)/settings/referrals/page.tsx` - NOVÁ server stránka: načte `referral_code` a `count(referred_by = id)`, vykreslí nadpis + kartu s readonly odkazem `https://postio-app.cz/{locale}/login?ref=CODE` a počtem doporučení.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální test: položka viditelná v desktop sidebaru i mobilním dropdownu, route funkční.
- **Poznámka**: Plná glassmorphism UI + kopírování + „Jak to funguje" je Krok 3. Odměnová logika (přidělování měsíců PRO) zatím NENÍ implementována – existuje jen datový model z Kroku 1.
- **Upravené soubory**: sidebar.tsx, mobile-nav.tsx, mobile-nav-wrapper.tsx, layout.tsx, cs.json, en.json, uk.json, referrals/page.tsx (nová).
