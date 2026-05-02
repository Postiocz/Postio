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
