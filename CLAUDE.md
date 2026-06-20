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

## � BUDOUCÍ ROZVOJ: LinkedIn Sync & Delete (Roadmap)

> Tato sekce popisuje cestu, jak povýšit současnou **manuální archivaci** LinkedIn příspěvků (viz `CHANGELOG.md` → 2026-06-20 → „Feature – LinkedIn soft-delete (archive) flow") na **plnou automatizovanou synchronizaci** se stavem příspěvků na platformě.

### Proč to nyní nejde

LinkedIn pro své **Community Management API (CM API)** vyžaduje, aby vývojářská aplikace byla registrovaná na **firemním e-mailu na vlastní doméně** (např. `info@postio.cz`). Registrace na Gmail / osobní e-maily je programově odmítána. Postio aktuálně CM API přístup nemá, takže read endpointy (`/v2/ugcPosts/{id}`, `/v2/shares/{id}`) vracejí **HTTP 403 ACCESS_DENIED** a my neumíme z API ověřit, zda příspěvek na LinkedInu stále existuje, nebo byl smazán.

Aktuální řešení proto používá **per-platform status `archived`** ([migrace 031](file:///c:/VS_Code/Postio/supabase/migrations/031_add_archived_status_to_post_platforms.sql)) — uživatel příspěvek v aplikaci ručně skryje, ale příspěvek na platformě může fyzicky stále existovat. Detekce skutečného smazání na LinkedInu zůstává konzervativně na `published`.

### Postup povýšení (až bude mít Postio vlastní doménu a firemní e-mail)

1. **Ověření identity**
   - Zřídit firemní e-mail na vlastní doméně (např. `info@postio.cz`) — tento e-mail bude sloužit výhradně jako **LinkedIn Developer / Company Page owner kontakt**.
   - LinkedIn pro registraci CM API nepřijímá Gmail ani jiné free-mailové domény.

2. **Samostatná aplikace v LinkedIn Developer Portálu**
   - Vytvořit dedikovanou aplikaci **„Postio-Sync"** (odděleně od stávající aplikace pro OAuth přihlašování / `w_member_social`).
   - Aktivovat v ní **POUZE produkt „Community Management API"**. Nepřidávat „Share on LinkedIn" — to je právě kombinace, kterou LinkedIn z právních důvodů odmítá (viz `CHANGELOG.md` → 2026-06-20 → „Refactor – LinkedIn sync: tichý režim pro 403").
   - Aplikaci svázat s LinkedIn Company Page, ze které se budou příspěvky spravovat.

3. **Implementace scopes**
   - Po schválení aplikace získáme OAuth scopes **`r_member_social`** (čtení stavu vlastních UGC postů) a **`r_organization_social`** (čtení stavu postů publikovaných za Company Page).
   - Rozšířit OAuth authorize URL v [src/app/api/accounts/linkedin/route.ts](file:///c:/VS_Code/Postio/src/app/api/accounts/linkedin/route.ts) o tyto read scopes.
   - Doporučeno vytvořit **dva oddělené OAuth flow**:
     - **Publikační flow** (současný `w_member_social`) — beze změny.
     - **Sync flow** (`r_member_social` + `r_organization_social`) — nový, pro `Postio-Sync` aplikaci.
     - Tokeny ukládat do `social_accounts` s `provider_app = "postio_sync"` pro odlišení.

4. **Automatizace — náhrada manuální archivace**
   - V [`syncPublishedPosts`](file:///c:/VS_Code/Postio/src/lib/actions/posts.ts#L839-L913) odebrat fallback větev pro **HTTP 403** a nahradit ji skutečným read dotazem.
   - **Stavový automat per-platform řádku**:
     - `2xx` → příspěvek žije → `last_sync_at` aktualizovat.
     - `404` → příspěvek smazán na platformě → `status="removed_externally"` + `removed_at` + `last_sync_at`.
     - `401` → token prošlý → refresh flow + retry jednou.
     - `5xx` / network → inconclusive, `last_sync_at` aktualizovat (zamezí spamu), příspěvek zůstává `published`.
   - **Migrace ze stavu `archived`**: Při prvním úspěšném sync běhu po nasazení CM API scopes projít všechny `archived` řádky a ověřit na platformě:
     - Pokud API vrátí `200` → příspěvek stále existuje → ponechat `archived` (uživatelovo rozhodnutí), nastavit `last_sync_at`.
     - Pokud API vrátí `404` → příspěvek byl skutečně smazán → přesunout na `removed_externally` + `removed_at`.
   - **UI cleanup**: V `DeletePostDialog` odebrat dedikovanou sekci „Archivovat LinkedIn příspěvek v aplikaci" — tlačítko „Smazat" bude nyní fungovat jako u ostatních platforem (API delete = skutečné smazání). Uživatelům s `archived` řádky nabídnout jednorázový banner: *„Postio nyní umí automaticky ověřit smazání na LinkedInu. Chcete obnovit a nechat synchronizovat?"*.

### Architektonická připravenost

Toto omezení je **čistě na straně LinkedIn API** (jejich policy pro CM API) a **Postio je architektonicky připraveno na okamžitý přechod**, jakmile bude k dispozici firemní identita. Konkrétně:

- DB model `post_platforms` (status, `archived_at`, `archive_reason`, `removed_externally`, `removed_at`, `last_sync_at`, `external_id`) je navržen tak, aby pokryl **oba** stavy — `archived` i `removed_externally` — aniž by bylo třeba měnit schéma.
- `syncPublishedPosts` již dnes rozlišuje 4 větve odpovědi (404 / 2xx / 403 / ostatní); po odstranění 403 fallbacku se automaticky aktivuje plná read logika.
- `getValidLinkedInAccessToken` ([src/lib/actions/publish-linkedin.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-linkedin.ts)) je připraven na multi-app drivery — rozšíření o `provider_app` parametr je triviální.
- `archiveLinkedInPlatformRow` / `restoreArchivedLinkedInPost` (server akce) zůstanou v kódu jako fallback pro případ, že by v budoucnu CM API přístup ztratil — žádný dead code, žádný refactor navíc.

### Trigger pro spuštění implementace

Tato roadmap **nebude implementována automaticky** (žádný trigger-based watcher). Spustí se **manuálně**, jakmile budou splněny tyto podmínky:

1. Postio má vlastní doménu (`postio.cz` nebo ekvivalent) a na ní zřízený pracovní e-mail.
2. V LinkedIn Developer Portálu je vytvořená a schválená aplikace **„Postio-Sync"** s aktivním produktem „Community Management API".
3. Uživatel dá vědět, že CM API je připraveno (typicky jednou větou v chatu).

Splnění všech tří → celá sekce „LinkedIn soft-delete (archive) flow" v `CHANGELOG.md` a tato roadmap sekce se přesunou do „Dokončené postponed úkoly (historie)" a provede se vlastní implementace podle kroků 1–4 výše.

## �🗂️ Budoucí úkoly čekající na trigger

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
