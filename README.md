# Postio – Social Media Content Planner

> Alternativa k **[Buffer](https://buffer.com)** pro tvůrce obsahu. Plánujte, publikujte a analyzujte své příspěvky na sociálních sítích z jednoho místa – s důrazem na jednoduchost, motivaci a produktivitu.

---

## ✨ Hlavní funkce

| Funkce | Popis |
|---|---|
| **Dashboard** | Přehledová stránka se statistikami (příspěvky, naplánované, propojené účty, série), consistency score a rychlými akcemi |
| **Plánování příspěvků** | Vytváření, editace a mazání příspěvků s podporou médií, lokací a štítků |
| **Kalendář** | Měsíční a týdenní pohled na plánovaný obsah s filtry podle platformy a statusu |
| **Analytika** | Interaktivní grafy (AreaChart, BarChart) s metrikami: dosah, interakce, lajky, komentáře, sdílení, kliknutí, uložení |
| **Šablony** | Ukládání opakovaně použitelných šablon příspěvků s prémiovým označením |
| **Správa účtů** | Propojování sociálních sítí (Instagram, Facebook, X, LinkedIn, YouTube, TikTok) |
| **Dvoufázové ověřování (2FA)** | TOTP s QR kódem a záchrannými kódy |
| **Mezinárodní podpora** | Čeština (výchozí), angličtina, ukrajinština |
| **Gamifikace** | Denní série (streak), skóre konzistence, průvodce dokončením nastavení |
| **Cookie consent** | Detailní správa cookies (nezbytné, funkční, analytické, reklamní) |

---

## 🛠 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **UI:** [React 19](https://react.dev), [TypeScript](https://www.typescriptlang.org), [Tailwind CSS v4](https://tailwindcss.com)
- **Komponenty:** [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [Lucide React](https://lucide.dev)
- **Backend & DB:** [Supabase](https://supabase.com) (Auth, PostgreSQL, Storage)
- **i18n:** [next-intl](https://next-intl-docs.vercel.app)
- **Animace:** [Framer Motion](https://www.framer.com/motion)
- **Grafy:** [Recharts](https://recharts.org)
- **2FA:** [otplib](https://github.com/yeojz/otplib), [qrcode](https://github.com/soldair/node-qrcode)

---

## 🚀 Instalace a spuštění

### 1. Klonování repozitáře

```bash
git clone https://github.com/vaclav-postio/postio.git
cd postio
```

### 2. Instalace závislostí

```bash
npm install
```

### 3. Environment variables

Zkopíruj `.env.example` do `.env.local` a vyplň hodnoty:

```bash
cp .env.example .env.local
```

| Proměnná | Popis |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL tvého Supabase projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Veřejný anon klíč Supabase |
| `NEXT_PUBLIC_APP_URL` | URL aplikace (produkce nebo `http://localhost:3000`) |

### 4. Databázové migrace

V konzoli Supabase SQL Editor spusť všechny SQL soubory z `/supabase/migrations/` v chronologickém pořadí (001 → 010).

> ⚠️ **Důležité:** Migrace obsahují RLS politiky, triggery a seed data. Bez jejich aplikace aplikace nebude plně funkční.

### 5. Spuštění vývojového serveru

```bash
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000) v prohlížeči.

---

## 📁 Struktura projektu

```
postio/
├── src/
│   ├── app/
│   │   ├── [locale]/              # Lokalizované routy
│   │   │   ├── (auth)/            # Přihlašovací stránky (login, onboarding, 2FA)
│   │   │   └── (dashboard)/       # Chráněné stránky (dashboard, posts, calendar, analytics, settings)
│   │   ├── api/                   # API routy (accounts, onboarding)
│   │   ├── auth/callback/         # OAuth callback pro Supabase
│   │   └── layout.tsx             # Root layout
│   ├── components/
│   │   ├── auth/                  # Auth komponenty (email-signin, google-button, logout)
│   │   ├── dashboard/             # Sidebar, mobile-nav, setup-guide
│   │   ├── settings/              # Nastavení komponenty
│   │   └── ui/                    # shadcn/ui komponenty (button, card, dialog, badge, ...)
│   ├── hooks/
│   │   └── use-media-upload.ts    # Hook pro nahrávání médií
│   ├── lib/
│   │   ├── actions/               # Server Actions (auth, posts, templates)
│   │   ├── supabase/              # Supabase klienti (browser, server, middleware, types)
│   │   └── utils.ts               # Utility funkce (cn, formatting)
│   ├── messages/                  # Překlady (cs.json, en.json, uk.json)
│   └── i18n/                      # next-intl konfigurace
├── supabase/
│   └── migrations/                # SQL migrace (001–010)
├── public/                        # Statické assety
├── .env.local                     # Lokální environment variables (není v gitu)
├── .env.example                   # Šablona environment variables
├── next.config.ts                 # Next.js konfigurace
└── package.json
```

---

## 🌐 Lokalizace

Aplikace podporuje 3 jazyky:

| Jazyk | Kód | Status |
|---|---|---|
| **Čeština** | `cs` | Výchozí, plně přeloženo |
| **Angličtina** | `en` | Plně přeloženo |
| **Ukrajinština** | `uk` | Plně přeloženo |

Překlady se nacházejí v `/src/messages/` a používají [ICU MessageFormat](https://formatjs.io/docs/core-concepts/icu-syntax/) pro množné číslo a interpolaci.

---

## 💎 Plány a ceny

| | **Free** | **Creator** | **Pro** |
|---|---|---|---|
| Účty | 1 | 5 | Neomezeně |
| Příspěvky/měsíc | 10 | Neomezeně | Neomezeně |
| Šablony | Základní | Neomezeně | Neomezeně |
| Analytika | Základní | Základní | Pokročilá |
| Podpora | – | – | Prioritní |
| **Cena** | Zdarma | 199 Kč / 8 EUR / 9 USD měsíčně | 499 Kč / 20 EUR / 22 USD měsíčně |

---

## 🎨 Design System

- **Pozadí:** Pure Black (`#000`)
- **Karty:** `#09090b` s opacitou
- **Radius:** `20px` (`rounded-[20px]`)
- **Styl:** Glassmorphism, mřížka `24×24px`, jemné glow gradienty
- **Fonty:** Geist / Inter pro texty, stylizované logo pro branding
- **Režimy:** Světlý / Tmavý / Podle systému

---

## 🧾 Databázové tabulky

| Tabulka | Popis |
|---|---|
| `users` | Profil, plán, jazyk, série, 2FA nastavení, předvolby |
| `social_accounts` | Propojené sociální sítě (platforma, token, aktivita) |
| `posts` | Příspěvky (obsah, média, platformy, status, naplánování) |
| `templates` | Šablony příspěvků |
| `analytics` | Metriky výkonu příspěvků (zobrazení, interakce, lajky, ...) |
| `tags` | Štítky pro kategorizaci obsahu |
| `cookie_consents` | Souhlasy s cookies |

Každá tabulka má RLS politiky – uživatelé vidí a upravují pouze svá vlastní data.

---

## ⚡ Užitečné příkazy

| Příkaz | Popis |
|---|---|
| `npm run dev` | Vývojový server (Webpack) |
| `npm run dev:turbo` | Vývojový server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Spuštění production buildu |
| `npm run lint` | ESLint kontrola |

---

## 👤 Autor

Vytvořil **Václav** s pomocí [Claude Code](https://claude.ai/code).

---

## 📄 Licence

Tento projekt je soukromý a není určen pro veřejnou distribuci.

---

> 💡 **Tip:** Před každou prací na projektu si přečti `CLAUDE.md` a `CHANGELOG.md` pro aktuální kontext a stav.
