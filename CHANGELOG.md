# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🎯 Feat - Referral systém: DB + zachycení kódu (Prompt 034, Krok 1)

- **Kontext**: Chyběl referral systém. Úkol 034 ("Doporuč a získej") vyžaduje uložení, kdo koho pozval, a unikátní kód pro sdílení odkazu.
- **Změny**: `supabase/migrations/039_add_referral_system.sql` - sloupce `referral_code` (UNIQUE TEXT) a `referred_by` (UUID → `users.id`, ON DELETE SET NULL); trigger `handle_new_user` generuje 6znakový unikátní kód (retry-loop proti kolizi); backfill kódů pro existující účty. `src/lib/referral.ts` - `applyReferral(code, userId)` přes admin klienta (funguje i bez session), idempotentní, ignoruje self-referral. `src/lib/referral-constants.ts` - `REFERRAL_COOKIE` bez server závislostí. `src/components/auth/ref-capture.tsx` - uloží `?ref=` z URL do cookie `postio_ref` (přežije OAuth i e-mail verifikaci). Napojeno v `src/lib/actions/auth.ts` (po `signUp`) a `src/app/auth/callback/route.ts` (po Google `exchangeCodeForSession`).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (registrace s `?ref=` zapíše `referred_by`; build bez chyby `next/headers` po vyňětí konstanty do `referral-constants.ts`).
- **Upravené soubory**: 039_add_referral_system.sql, referral.ts, referral-constants.ts, ref-capture.tsx, login/page.tsx, actions/auth.ts, callback/route.ts.

### 💱 Feat - Currency Switcher + izolace (Prompt 033, Krok 3+5)

- **Kontext**: Ceník zobrazoval jen EUR, žádný přepínač měn. Serif (Krok 1+2) byl aplikován jen na marketing, izolace aplikace potvrzena.
- **Změny**: `src/components/marketing/currency-switcher.tsx` - nová client komponenta (pilulkový segmented control, glassmorphism, 20px radius, indigo accent, 3 měny CZK/EUR/USD). `src/lib/pricing.ts` - helper `formatPrice` (CZK "199 Kč", EUR "8 €", USD "$9", free fallback). `src/components/marketing/pricing-client.tsx` - nová client island (Landing: switcher + karty, serif cena zachována). `src/components/marketing/pricing-section.tsx` - přepsáno na server (data → PricingClient). `src/app/[locale](dashboard)/settings/billing/billing-card.tsx` - prop `currency` + `formatPrice` (zůstává sans). `src/app/[locale](dashboard)/settings/billing/billing-client.tsx` - nová client island (Fakturace: switcher nad gridem). `src/app/[locale](dashboard)/settings/billing/page.tsx` - volá BillingClient. Krok 3: izolace realizována bez propu (serif jen na marketing, billing-card sans).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (switcher přepíná CZK/EUR/USD na Landing i Fakturace, serif jen na Landing, Dashboard sans).
- **Upravené soubory**: currency-switcher.tsx, lib/pricing.ts, pricing-client.tsx, pricing-section.tsx, billing-card.tsx, billing-client.tsx, billing/page.tsx.

### 💱 Feat - Datový model měn (Prompt 033, Krok 4)

- **Kontext**: Ceník zobrazoval jen EUR. Pro budoucí přepínač měn byly potřebny 3 hodnoty (CZK, EUR, USD) na každé kartě.
- **Změny**: `src/components/marketing/pricing-section.tsx` - rozšířen `Plan` interface o `priceCzk`/`priceUsd` a naplněna data (Free 0/0/0, Creator 199/8/9, Pro 499/20/22). `src/app/[locale](dashboard)/settings/billing/page.tsx` i `billing-card.tsx` už měly všechny 3 měny (potvrzeno). Datový model sjednocen v obou cenících.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/components/marketing/pricing-section.tsx`.

### ✨ Feat - Dual-Font System (Prompt 033, Krok 1+2)

- **Kontext**: Landing Page měla pouze bezpatkový Inter. Cílem bylo povýšit vizuál prémiovým patkovým písmem (Playfair Display) pro nadpisy a ceny, zatímco Dashboard a Fakturace zůstávají čistě sans-serif.
- **Změny**: `src/app/layout.tsx` - naimportován Google Font `Playfair_Display` jako `--font-serif` (váhy 400 až 900) a přidán do `<html>` className. `src/app/globals.css` - zaregistrována `--font-serif` v `@theme inline`. `src/app/[locale](marketing)/page.tsx` - `font-serif` na H1 (hero) a H2 (Benefits). `src/components/marketing/pricing-section.tsx` - `font-serif` na H2 sekce ceníku a na velké číslo ceny. `src/components/marketing/faq-section.tsx` - `font-serif` na H2 sekce FAQ. Jména plánů (H3) a Fakturace zůstávají sans.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (serif viditelný na Landing, Dashboard sans).
- **Upravené soubory**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/[locale](marketing)/page.tsx`, `src/components/marketing/pricing-section.tsx`, `src/components/marketing/faq-section.tsx`.

### 📝 Upgrade – Profesionální README.md + obrázky

- **Kontext**: Aktuální README byl příliš strohý, neodrážel aktuální kvalitu projektu Postio a chyběly klíčové informace (odkaz na produkci, unikátní funkce, architektura).
- **Změny**: Kompletně přepsán `README.md`: přidán header s názvem, podnadpisem a odkazem na `postio-app.cz`; přidány obrázky (logo.svg a hero-mockup_cs.png) z public/; sekce s unikátními funkcemi (AI Vision, Multi-platform, High-Fidelity Previews, Auto-Queue, Analytika); přehlednější Tech Stack; sekce Getting Started; část o architektuře Post + Platform Instances; detailní Design System s Glassmorphism a 20px radiusem; tabulka podporovaných sítí.
- **Ověření**: Soubor je formátován v Markdownu, obrázky jsou přidány.
- **Upravené soubory**: `README.md`.
