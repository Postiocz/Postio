# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0).

### 🚀 Prompt 043 – KROK 3: AI Štětec tlačítko v editoru ✅

- **Kontext**: Backend route pro generování obrázků existovala, chybělo UI propojení v editoru.
- **Změny**:
  - ✅ `src/hooks/use-media-upload.ts`: Přidána metoda `addImageUrl(url)` pro přímé přidání remote URL bez upload pipeline.
  - ✅ `src/components/ai-assistant-button.tsx`: Nová položka „AI Štětec 🎨" v dropdown menu s modalem pro prompt, voláním `/api/ai/generate-image`, callbackem `onImageGenerated`.
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx`: Propojen `onImageGenerated` → `addImageUrl`.
  - ✅ `src/components/edit-post-dialog.tsx`: Stejné propojení v dialogu pro editaci.
  - ✅ i18n: Doplněny klíče `aiGenerateBtn`, `cancel` v sekci `ai` (cs/en/uk).
- **Ověření**: `npx tsc --noEmit` ✅ (žádné nové chyby).

### 🚀 Prompt 043 – KROK 2: Backend route /api/ai/generate-image + i18n ✅

- **Kontext**: Kreditový systém vyžadoval backend routu pro generování obrázků přes OpenAI DALL-E 3.
- **Změny**:
  - ✅ `src/app/api/ai/generate-image/route.ts`: POST route s auth kontrolou, ověřením `ai_credits`, voláním DALL-E 3 API, odečtením kreditu po úspěchu.
  - ✅ Error handling: 401 (unauth), 400 (chybějící prompt), 402 (žádné kredity), 503 (API key nenastaven), 500 (obecná chyba).
  - ✅ Edge runtime pro rychlost.
- **Změny i18n**:
    - ✅ `messages/cs.json`, `en.json`, `uk.json`: Doplněny klíče `generateImage`, `aiGeneratingImage`, `aiNoCredits`, `aiImageSuccess`, `aiImagePrompt`.
  - **Ověření**: JSON validace ✅, `npx tsc --noEmit` ✅ (žádné nové chyby).

### 🚀 Prompt 043 – KROK 1: DB migrace AI + Twitter kredity ✅

- **Kontext**: Kreditový systém pro drahé funkce (AI obrázky, auto X posty) vyžadoval nové sloupce v tabulce `users`.
- **Změny**:
  - ✅ `supabase/migrations/042_add_ai_and_twitter_credits.sql`: Přidány sloupce `ai_credits` a `twitter_auto_credits` (integer, default 0).
  - ✅ UPDATE existujících uživatelů: Creator → 10/10, Pro → 50/50.
- **Ověření**: Migrace aplikována do Supabase ✅.

### 🚀 Prompt 042 – Kompletní implementace Admin Management + Audit Log + Lokalizace ✅

- **Kontext**: Stránky Admin Management a Audit Log v `/admin/settings` byly nefunkční. Potřebovaly funkční obsah, propojení a překlady.
- **Změny**:
  - ✅ `admin/settings/page.tsx`: Oprava odkazů na `/${locale}/admin/settings/*` (chyběl locale prefix)
  - ✅ `admin/settings/team/page.tsx`: Kompletní redesign s vyhledáváním dle jména/emailu/ID, filtrováním podle role, správou rolí a statistikami
  - ✅ `admin/settings/audit-log/page.tsx`: Audit log s vyhledáváním, barevně odlišenými akcemi, rozbalovacím detailem a JOINem na users pro jména
  - ✅ `modules/admin-core/actions.ts`: Rozšířena `getAllUsers()` o parametr `{ role }`; přidán JOIN na users v `getAuditLogs()`
  - ✅ i18n: Nové klíče pro adminTeam a adminAuditLog (cs + en) – filtry, stavy, statistiky, typy akcí
  - ✅ Responzivní design, glassmorphism, loading/empty states
- **Ověření**: Manuální test ✅

### 🚀 Prompt 041 – Kompletní lokalizace Admin sekce ✅

- **Kontext**: Všechny admin stránky měly texty natvrdo v češtině bez i18n.
- **Změny**:
  - ✅ 9 nových i18n namespace: adminDashboard, adminAnalyticsPage, adminBillingPage, adminSettingsPage, adminTeam, adminAuditLog, adminPostsPage, adminUsersPage, adminUserDetail
  - ✅ Všechny admin stránky přepsány na i18n (cs + en)
    - admin/page.tsx (dashboard)
    - admin/analytics/page.tsx
    - admin/billing/page.tsx
    - admin/settings/page.tsx (včetně team a audit-log)
    - admin/posts/page.tsx
    - admin/users/page.tsx (včetně detailu [id])
  - ✅ Server komponenty: getTranslations({ locale, namespace })
  - ✅ Client komponenty: useTranslations(namespace)
  - ✅ Oprava "Zpět do aplikace" → /${locale}/dashboard
  - ✅ Doplnění uk.json pro typovou kompatibilitu
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅
- **Upravené soubory**: messages/cs.json, en.json, uk.json, 8 admin stránek, admin-sidebar.tsx, admin-mobile-nav.tsx

### 🚀 Prompt 040 – Kompletní implementace Admin Core ✅

- **Kontext**: Oživit existující menu položky a přidat billing modul do admin sekce.
- **Změny**:
  - ✅ Modul Příspěvky (globální tabulka všech příspěvků)
  - ✅ Modul Fakturace (Stripe integrace, předplatné a faktury)
  - ✅ Modul Analytika (grafy růstu, MRR)
  - ✅ Modul Nastavení (Správa adminů, Audit log)
  - ✅ Přidání odkazu "Zpět do aplikace" v desktop a mobile admin navigaci
  - ✅ Překlady pro admin sekci (cs/en, bez ukrajiny)
  - ✅ Oprava Stripe chyb (expand limits)
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅
- **Upravené soubory**:
  - src/modules/admin-core/actions.ts
  - src/modules/admin-core/components/admin-sidebar.tsx
  - src/modules/admin-core/components/admin-mobile-nav.tsx
  - src/modules/admin-core/index.ts
  - src/components/locale-switcher.tsx
  - src/app/[locale]/(admin)/admin/posts/page.tsx
  - src/app/[locale]/(admin)/admin/billing/page.tsx
  - src/app/[locale]/(admin)/admin/analytics/page.tsx
  - src/app/[locale]/(admin)/admin/settings/page.tsx
  - src/app/[locale]/(admin)/admin/settings/audit-log/page.tsx
  - src/app/[locale]/(admin)/admin/settings/team/page.tsx
  - messages/cs.json, messages/en.json, messages/uk.json
  - ukol.md, CHANGELOG.md

### 🚀 Prompt 040 – KROK 3: Překlad a zpět do aplikace ✅

- **Kontext**: Přeložit billing do češtiny a přidat odkaz z admina zpět do aplikace.
- **Změny**:
  - Přidány překladové klíče pro adminAnalytics, adminSettings, adminBackToApp
  - Admin sidebar nyní používá i18n pro všechny popisky
  - Přidán odkaz "Zpět do aplikace" do admin sidebaru
  - Přidána položka "Zpět do aplikace" do mobilní admin navigace
  - Oprava cesty pro billing v mobilní navigaci na /admin/billing
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**:
  - messages/cs.json, messages/en.json, messages/uk.json,
  - modules/admin-core/components/admin-sidebar.tsx,
  - modules/admin-core/components/admin-mobile-nav.tsx,
  - ukol.md, CHANGELOG.md

### 🚀 Prompt 040 – KROK 2,5 (hotfix): Oprava Stripe expand level 4 error ✅

- **Kontext**: Stripe API nepovoluje expandovat více než 4 úrovně hluboko (`data.lines.data.price.product` je 5 úrovní).
- **Změny**:
  - **`modules/admin-core/actions.ts`**: Odebrány hluboké expandy (zbývá pouze `data.customer` pro předplatné i faktury).
  - **`admin/billing/page.tsx`**: Aktualizace logiky pro získání jména plánu (používá `price.nickname` nebo `price.id`).
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `modules/admin-core/actions.ts`, `admin/billing/page.tsx`.

### 🚀 Prompt 040 – KROK 2,5: Oprava Stripe chyb a admin překlady ✅

- **Kontext**: Stripe API vracelo chybu pro neplatný expand `data.plan` u faktur, v adminu jsme chtěl odstranit ukrajinu z přepínače jazyků.
- **Změny**:
  - **`modules/admin-core/actions.ts`**: Oprava expand v `getAllInvoices()` na `data.lines.data.price.product`.
  - **`components/locale-switcher.tsx`**: Přidán `isAdmin` prop, který skrývá ukrajinu v adminu.
  - **`modules/admin-core/components/admin-header.tsx`**: Přidání `isAdmin={true}` k `LocaleSwitcher`.
  - **`ukol.md`**: Aktualizace úkolů.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `modules/admin-core/actions.ts`, `components/locale-switcher.tsx`, `modules/admin-core/components/admin-header.tsx`, `ukol.md`.

### 🚀 Prompt 039 – KROK 3: Responzivita admin/users, design polish + sidebar fix ✅

- **Kontext**: Admin tabulka uživatelů nebyla na mobilu použitelná (HTML table přetékala). Desktop admin sidebar byl neviditelný (chyběla `lg:flex` třída). Detail uživatele postrádal tlačítko zpět.
- **Změny**:
  - **`admin/users/page.tsx`**: Responzivní layout — desktop tabulka, mobil karty (avatar, jméno, ID, badge role/plan, streak, datum). Každá karta je klikací link na detail. Glassmorphism `bg-[#09090b]/80`, `rounded-[20px]`.
  - **`admin/users/[id]/page.tsx`**: Přidán odkaz "Zpět na přehled uživatelů" s ikonou `ArrowLeft` nad hlavičkou.
  - **`admin-sidebar.tsx`**: Opravena třída `hidden` → `hidden lg:flex`. Přidáno logo "Admin", opravena detekce aktivní položky (funguje i pro nested routy `/users/[id]`), přidán active dot.
  - **`admin-mobile-nav.tsx`**: Design polish — gradientní top linka `via-indigo-500/30`, jemný fialový glow `shadow-[0_-4px_20px_rgba(99,102,241,0.06)]`.
  - **i18n**: Všechny klíče pro admin navigaci hotové.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (responzivní tabulka, sidebar viditelný, zpět na detailu).
- **Upravené soubory**: `admin/users/page.tsx`, `admin/users/[id]/page.tsx`, `admin-sidebar.tsx`, `admin-mobile-nav.tsx`, `ukol.md`, `CHANGELOG.md`.


