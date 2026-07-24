# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0).


### 🚀 Prompt 043-C – KROK 5: UI Indikátory kreditů v Editoru ✅

- **Kontext**: Uživatelé neviděli zbývající kredity pro AI obrázky a X posty. Chyběla vizuální indikace v editoru.
- **Změny**:
  - ✅ `src/app/api/accounts/route.ts': GET vrací `{ accounts, credits }` s `ai_credits` a `twitter_auto_credits`.
  - ✅ `src/components/ai-assistant-button.tsx': Nová prop `aiCredits`, badge 🎨 u „Generovat obrázek" v dropdown menu (text-[10px]).
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx': Načtení kreditů z API, badge ⚡ u Twitter platformy, předání `aiCredits` do AIAssistantButton.
  - ✅ `src/components/edit-post-dialog.tsx': Stejné indikátory jako v new/page.tsx.
- **Ověření**: `npx tsc --noEmit` ✅ (žádné nové chyby, pouze 4 pre-existing).

### 🚀 Prompt 043 – KROK 4: Upgrade odesílání na X — kredity + API ✅

- **Kontext**: Platící uživatelé (Creator/Pro) s `twitter_auto_credits` mohou používat automatické odesílání na X. OAuth route `/api/accounts/x` existovala, chybělo UI propojení a kontrola kreditů.
- **Změny**:
  - ✅ `src/components/x-connect-modal.tsx`: Povolena sekce "Automatické odesílání (API)" — tlačítko redirectuje na X OAuth, badge "1 kredit/post".
  - ✅ `src/app/[locale]/(dashboard)/accounts/page.tsx`: Přidán handler `handleXAutoConnect` pro OAuth redirect, předán jako `onAutoConnect` do `XConnectModal`.
  - ✅ `src/lib/actions/publish.ts`: Kontrola `twitter_auto_credits` před voláním X API (v `publishPost` i `publishAdditionalPlatforms`). Odečet 1 kreditu po úspěšném publikování.
  - ✅ i18n (cs/en/uk): Nové klíče `autoCreditCost`, aktualizovány `autoDesc`, `autoButton`.
- **Ověření**: `npx tsc --noEmit` ✅ (žádné nové chyby, pouze 4 pre-existing).

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
