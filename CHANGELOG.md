# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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
- **Změny**: `src/components/marketing/pricing-section.tsx` - rozšířen `Plan` interface o `priceCzk`/`priceUsd` a naplněna data (Free 0/0/0, Creator 199/8/9, Pro 499/20/22). `src/app/[locale]/(dashboard)/settings/billing/page.tsx` i `billing-card.tsx` už měly všechny 3 měny (potvrzeno). Datový model sjednocen v obou cenících.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/components/marketing/pricing-section.tsx`.

### ✨ Feat - Dual-Font System (Prompt 033, Krok 1+2)

- **Kontext**: Landing Page měla pouze bezpatkový Inter. Cílem bylo povýšit vizuál prémiovým patkovým písmem (Playfair Display) pro nadpisy a ceny, zatímco Dashboard a Fakturace zůstávají čistě sans-serif.
- **Změny**: `src/app/layout.tsx` - naimportován Google Font `Playfair_Display` jako `--font-serif` (váhy 400 až 900) a přidán do `<html>` className. `src/app/globals.css` - zaregistrována `--font-serif` v `@theme inline`. `src/app/[locale]/(marketing)/page.tsx` - `font-serif` na H1 (hero) a H2 (Benefits). `src/components/marketing/pricing-section.tsx` - `font-serif` na H2 sekce ceníku a na velké číslo ceny. `src/components/marketing/faq-section.tsx` - `font-serif` na H2 sekce FAQ. Jména plánů (H3) a Fakturace zůstávají sans.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (serif viditelný na Landing, Dashboard sans).
- **Upravené soubory**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/[locale]/(marketing)/page.tsx`, `src/components/marketing/pricing-section.tsx`, `src/components/marketing/faq-section.tsx`.

### 📝 Upgrade – Profesionální README.md + obrázky

- **Kontext**: Aktuální README byl příliš strohý, neodrážel aktuální kvalitu projektu Postio a chyběly klíčové informace (odkaz na produkci, unikátní funkce, architektura).
- **Změny**: Kompletně přepsán `README.md`: přidán header s názvem, podnadpisem a odkazem na `postio-app.cz`; přidány obrázky (logo.svg a hero-mockup_cs.png) z public/; sekce s unikátními funkcemi (AI Vision, Multi-platform, High-Fidelity Previews, Auto-Queue, Analytika); přehlednější Tech Stack; sekce Getting Started; část o architektuře Post + Platform Instances; detailní Design System s Glassmorphism a 20px radiusem; tabulka podporovaných sítí.
- **Ověření**: Soubor je formátován v Markdownu, obrázky jsou přidány.
- **Upravené soubory**: `README.md`.

### ✅ Ověření – Mobilní responzivita (KROK 5, finální)

- **Kontext**: Závěrečné ověření všech 4 kroků opravy mobilní responzivity: globální přetečení (KROK 1), burger menu landing (KROK 2), cookie dialog + footer newsletter (KROK 3), skrytí plovoucí karty na `/privacy` (KROK 4).
- **Změny**: Žádné kódové změny – finální kontrola. `npx tsc --noEmit` ✅ nad celým projektem (EXIT 0). Manuální test na 320/375/390px potvrdil: landing burger (funkční X zpět), cookie karta→dialog (posouvatelný, zavírá se přes X i „Zavřít", footer bez přetečení), `/privacy` (karta skryta, návrat funkční; jinde se zobrazuje).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: žádné (ověřovací milník).

### 🐛 Oprava – Skrytí plovoucí cookie karty na `/privacy` (KROK 4)

- **Kontext**: Na stránce `/privacy` (cs/en/uk) je vlastní sekce Cookies + návratové tlačítko dole, ale plovoucí cookie karta (vpravo dole, `z-50`) ho překrývala, takže se uživatel „nedostal zpět".
- **Změny**: `src/components/cookie-consent.tsx` — přidána detekce routy `isPrivacyPage = pathname.replace(/\/$/, "") === \`/${locale}/privacy\``; plovoucí karta obalena podmínkou `{!isPrivacyPage && (...)}`, takže na `/privacy` se nevykresluje (preferences dialog zůstává v kódu, ale není na této routě dostupný).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (karta na `/privacy` zmizela, návrat funguje; jinde se zobrazuje).
- **Upravené soubory**: `src/components/cookie-consent.tsx`.

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

