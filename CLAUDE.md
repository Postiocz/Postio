# POSTIO – Projekt kontext pro Claude CLI

> Tento soubor čti vždy na začátku každé session. Obsahuje stálý kontext projektu.

> Komunikuj se mnou VŽDY v češtině.

## Co je Postio

Webová aplikace – alternativa k Buffer. Tvůrci obsahu spravují, plánují a publikují příspěvky na sociálních sítích. Důraz na jednoduchost, motivaci a produktivitu.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (free tier) – DB, Auth, Storage
- Vercel (free tier) – hosting
- GitHub (free tier) – repozitář
- next-intl – i18n (cs výchozí, en, uk)
- shadcn/ui – komponenty
- Framer Motion – animace

## Jazyky aplikace

Čeština (výchozí) | Angličtina | Ukrajinština

Překlady v: /messages/cs.json, en.json, uk.json

## Design

- Barva: #6366F1 (indigo/purple)
- Font: Inter nebo Geist
- Light/dark mode (systém + manuální přepínač)
- Mobile-first, responzivní

### Design System Standard
- Pozadí: Pure Black (#000).
- Radius: 20px (rounded-[20px]).
- Styl: Glassmorphism, grid pattern, barevné logo.

### Standard Postio UI
- **Barevné schéma**: Pure Black (#000) pozadí, Card bg (#09090b s opacitou).
- **Radius**: Všude 20px (`rounded-[20px]`).
- **Efekty**: Glassmorphism, mřížka 24x24px, jemné glow gradienty.
- **Fonty**: Geist/Inter pro texty, stylizované Logo pro branding.
- **Login Page**: Rozdělení 40% (levý panel s formou) / 60% (pravý vizuální panel).
- **Levý panel**: Obsah vycentrován (`max-w-[320px]`), `LocaleSwitcher` absolutně v pravém horním rohu.
- **Pravý panel**: Tušený grid (`opacity-[0.04]`), velká fialová záře (`blur-[160px]`).
- **Cookie Consent**: Plovoucí karta vpravo dole (max-w-[400px], backdrop-blur), detailní modal s přepínači kategoriemi (Necessary, Functional, Analytical, Advertising).

## Plány

| | Free | Creator | Pro |
|---|---|---|---|
| Účty | 1 | 5 | ∞ |
| Příspěvky/měs | 10 | ∞ | ∞ |
| Cena | zdarma | 199 Kč/8 EUR/9 USD | 499 Kč/20 EUR/22 USD |

## Databázové tabulky (Supabase)

- users, social_accounts, posts, templates, analytics, cookie_consents
- RLS politiky na všech tabulkách
- `posts.status` CHECK constraint: `('draft', 'scheduled', 'publishing', 'published', 'failed')`
- `auth.users` slouží pouze pro primární identitu (E-mail/Heslo). Sociální integrace jsou uloženy výhradně v `public.social_accounts`.

## Struktura projektu

```
/app/[locale]/(auth)/       – přihlašovací stránky
/app/[locale]/(dashboard)/  – chráněné stránky
/components/                – sdílené komponenty
/lib/                       – Supabase klient, utility
/messages/                  – překlady
/hooks/                     – custom React hooks
/supabase/migrations/       – SQL migrace
CHANGELOG.md                – stavební deník (čti před prací!)
README.md                   – aktuální stav projektu
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📱 Sociální sítě – UI/UX & API pravidla (Bibla pravidel)

Tato pravidla mají striktní prioritu při implementaci features spojených s publikováním a správou postů.

### 1. UI Pravidla pro Editaci postů po publikování

| Platforma | Editace textu | Smazání | UI Chování |
|---|---|---|---|
| **Facebook** | ✅ Ano | ✅ Ano | Zdůrazni tlačítko "Aktualizovat na sítích" |
| **Instagram** | ❌ Ne | ✅ Ano | Info banner: "Editace není platformou podporována" |
| **LinkedIn** | ❌ Ne | ✅ Ano | Info banner: "Editace není platformou podporována" |
| **TikTok** | ❌ Ne | ❌ Ne | Ikona zámku 🔒 – úplné uzamření po publikování |
| **YouTube** | ✅ Ano | ✅ Ano | Plná podpora editace i smazání |
| **X (Twitter)** | ❌ Ne | ✅ Ano | Smazání funguje, editace není podporována API |

### 2. Validace médií (před odesláním)

- **Instagram:**
  - Povol pouze **JPEG** formát.
  - Validuj poměr stran v rozmezí **4:5 až 1.91:1**.
  - Pokud poměr nesedí, zobraz **varování předem** (před odesláním).

### 3. Logika tokenů

- Připrav pole `token_expires_at` v tabulce `social_accounts`.
- Monitoruj datum expirace – zejména **LinkedIn (60 dní)**.
- Před publikováním kontroluj, zda token nevypršel.

### 4. Specifika sítí

- **LinkedIn:** Žádné PDF karusely. Tagování lidí (`@mention`) je jen prostý text – API ho neřeší jako entity.
- **X (Twitter):** Free tier – jen write-only (publikování a smazání). Nelze číst timeline.

## Pravidla pro psaní kódu

- TypeScript strict mode
- Čistý, komentovaný kód (komentáře v angličtině)
- Po každém kroku vysvětli co jsi udělal a proč – v češtině
- Před každou session přečti CHANGELOG.md

## 🤖 Pravidla pro kontinuální práci

Tato pravidla mají nejvyšší prioritu a musí být dodržována vždy:

1. **Na začátku každé session vždy:**
   - Přečti tento soubor (CLAUDE.md)
   - Přečti CHANGELOG.md
   - Zjisti aktuální stav projektu čtením souborů – neptej se mě

2. **Během práce:**
   - Pokračuj automaticky bez čekání na schválení každého kroku
   - Nepokládej otázky které lze zodpovědět čtením souborů projektu
   - Pokud narazíš na nejasnost, zvol nejrozumnější řešení a vysvětli proč
   - Dělej více kroků najednou pokud na sobě logicky navazují

3. **Otázky pokládej POUZE když:**
   - Neexistuje žádné rozumné výchozí řešení
   - Rozhodnutí má zásadní dopad na architekturu
   - Chybí kritická informace kterou nelze dohledat v projektu

4. **Po dokončení každého kroku:**
   - Vysvětli co jsi udělal a proč – v češtině
   - Aktualizuj CHANGELOG.md
   - Pokračuj automaticky na další logický krok

5. **Při překročení kontextu:**
   - Přečti CHANGELOG.md pro orientaci kde jsi skončil
   - Pokračuj od posledního nedokončeného kroku bez dotazování

6. **Správa kontextového okna (token limit 65536):**
   - Během práce hlídej spotřebu tokenů – limit je ~65k tokenů
   - Piš stručně: jen updates pro uživatele, žádné dlouhé summary
   - Čti pouze soubory které potřebuješ, ne celé stromy
   - Po dokončení každého kroku smaž staré výstupy z paměti pokračováním dál
   - Pokud přebíháš 40k tokenů: shrň stav do CHANGELOG.md a požádej o novou session

## 🗂️ Budoucí úkoly čekající na trigger

Tato sekce obsahuje úkoly, které **čekají na splnění určité podmínky (triggeru)**. Pravidlo: při každé session **aktivně zkontroluj**, zda některý trigger nebyl splněn. Pokud ano, implementuj příslušný úkol **automaticky bez dotazování** (v rámci pravidel kontinuální práce).

### 🔄 Bod 4 – Breakdown v Analytice podle štítků (ČEKÁ NA TRIGGER)

- **Trigger (přesná podmínka pro implementaci)**: Stránka `/[locale]/analytics` je plně implementovaná a funkční. Musí platit **VŠECHNY** tyto podmínky:
  1. Soubor `src/app/[locale]/(dashboard)/analytics/page.tsx` existuje a není placeholder/empty state.
  2. Zobrazuje alespoň **základní metriky**: celkový počet příspěvků, dosah, engagement podle platformy a podle časového období (7 dní / 30 dní / 90 dní / Vše).
  3. V layoutu (sidebar/navigaci) je odkaz na analytiku aktivní (ne "coming soon").
- **Postup detekce triggeru na začátku session**:
  1. Přečti `src/app/[locale]/(dashboard)/analytics/page.tsx` a případně `src/lib/actions/analytics.ts`.
  2. Ověř, že analytics zobrazuje reálná data, ne placeholder.
  3. Pokud trigger splněn → pokračuj implementací níže.
- **Co se má udělat (scope implementace)**:
  - Přidat novou sekci/kartu **"Příspěvky podle štítků"** do analytics page, která zobrazuje breakdown příspěvků podle interních štítků.
  - **Vizuál**: Horizontální bar chart – každý tag = jeden řádek s:
    - Barevnou tečkou (10px kroužek) v barvě tagu z `tags.color`.
    - Názvem tagu.
    - Počtem příspěvků (absolutní číslo + % z celku).
  - **Interakce**: Kliknutím na řádek otevře detail – kolik příspěvků daného tagu je v každém stavu (published/scheduled/draft/failed) a případně další breakdown podle platformy.
  - **Filtrování**: Časový rozsah (7 dní / 30 dní / 90 dní / Vše) konzistentní s ostatními sekcemi analytiky (sdílený state/komponenta).
  - **Top N**: Zobrazit top 10 tagů, ostatní agregovat do "Ostatní".
- **Datový zdroj**:
  - Agregace z `posts` (přes `user_id`) + `post_tags` (vazební tabulka) + `tags` (jméno a barva).
  - Doporučený dotaz: `select tags(id, name, color), count:posts(id)` se seskupením na straně DB, NEBO klientská agregace v `useMemo` z již načtených dat.
  - Žádné nové sloupce v DB nejsou potřeba – `post_tags` a `tags` tabulky již existují.
- **Soubory k úpravě** (orientační):
  - `src/app/[locale]/(dashboard)/analytics/page.tsx` – přidat novou sekci.
  - `src/lib/actions/analytics.ts` (nebo nový) – agregační logika.
  - `src/components/analytics/tag-breakdown.tsx` (nový) – vizuální komponenta.
  - `src/messages/{cs,en,uk}.json` – překlady (sekce `analytics`).
- **Styl**: Glassmorphism karta, `rounded-[20px]`, konzistentní s Postio designem (Pure Black pozadí, indigo/purple akcenty).
- **Proč se to má udělat**: Uživatelé potřebují analyzovat, které kategorie obsahu (interní štítky) mají nejlepší/nejhorší výkonnost. Štítky jsou nyní plně používané (vytváření, přiřazování, filtrování) – analytický breakdown uzavírá celý use case.
- **Po dokončení**:
  1. Aktualizuj `CHANGELOG.md` (záznam o dokončení).
  2. **Odeber tuto sekci** z CLAUDE.md a přesuň ji do historie "Dokončené postponed úkoly" níže.
  3. Smaž starou verzi úkolu z "Co zůstává na další iteraci" v CHANGELOG záznamech, pokud se tam vyskytuje.

### 📜 Dokončené postponed úkoly (historie)

- ✅ **Bod 1 – Filtry v Příspěvky/Kalendáři podle štítků** (2026-06-15) – Implementováno. Viz CHANGELOG.md sekce "Feature – Filtr podle interních štítků v Příspěvky/Kalendáři".
