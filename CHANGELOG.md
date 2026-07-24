# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0).




### 🚀 Prompt 044 – KROK 3: Admin System Check ✅

- **Kontext**: Před ostrým startem chyběl přehledný dashboard pro kontrolu stavu API připojení (Stripe, OpenAI, TikTok atd.).
- **Změny**:
  - ✅ `src/modules/admin-core/actions.ts': Nová funkce `getSystemStatus()` kontrolující všech 9 API služeb.
  - ✅ `src/app/[locale]/(admin)/admin/system-check/page.tsx': Nová stránka `/admin/system-check` s přehledem "Připojeno/Nepřipojeno" a vizuálními indikátory.
  - ✅ `src/modules/admin-core/components/admin-sidebar.tsx': Přidán odkaz "System Check" do admin navigace.
  - ✅ i18n (cs/en/uk): Nový namespace `adminSystemCheckPage` se všemi překlady.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb).

### 🚀 Prompt 044 – KROK 4: Ochrana soukromí a logů ✅

- **Kontext**: Produkční aplikace vypisovala do konzole prohlížeče citlivá data (tokeny, user IDs). Risk pro App Review demo video.
- **Změny**:
  - ✅ `src/lib/logger.ts`: Nová produkční logger utility – `debug`/`warn` jsou potlačeny v produkci, `error`/`info` prochází vždy.
  - ✅ Kritické token logy odstraněny: `publish.ts` (token last-10/12 chars), `publish-linkedin.ts` (celé payload dumpy odstraněny).
  - ✅ Klientské komponenty: 15× `console.log` → `logger.debug` (potlačeno v produkci).
  - ✅ OAuth routy: X, TikTok, LinkedIn, Stripe – `console.log`/`error` → `logger` s odstraněním auth kódů a user ID.
  - ✅ Bezpečnostní fix: `layout.tsx` již neloguje `user.id` do konzole prohlížeče.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb).

### 🚀 Prompt 044 – KROK 2: Příprava pro externí Plánovač (Cron Bypass) ✅

- **Kontext**: Edge funkce `process-scheduled-posts` potřebovala podporu pro externí cron trigger (cron-job.org) jako náhradu za chybějící Vercel/Supabase cron na free tieru.
- **Změny**:
  - ✅ `supabase/functions/process-scheduled-posts/index.ts': Přidány helpery `getCronSecret()` a `checkCronSecret()` pro ověření `Authorization: Bearer [CRON_SECRET]` hlavičky. CRON_SECRET je kontrolován jako první auth metoda; pokud není nastaven, funkce funguje zpětně kompatibilně.
  - ✅ `supabase/config.toml': Přidán komentář o nutnosti nastavit `CRON_SECRET` v Supabase Dashboard.
- **Ověření**: Externí cron-job.org vrací 200 OK ✅.

### 🚀 Prompt 043-C – KROK 7: Lokalizace (i18n) – kreditové hlášky ✅

- **Kontext**: Chybové hlášky o nedostatku X kreditů byly natvrdo v češtině. Chyběly i18n klíče pro UI hlášky.
- **Změny**:
  - ✅ i18n (cs/en/uk): Nový klíč `xConnect.noCredits` v namespace `accounts`.
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx': `resolvePublishErrorMessage` kontroluje X kredit error a vrací lokalizovanou hlášku.
  - ✅ `src/components/edit-post-dialog.tsx': Stejná logika v `resolveLocalizedPublishError`.
- **Ověření**: `npx tsc --noEmit` ✅ (4 pre-existing).

### 🚀 Prompt 043-C – KROK 6: Aktualizace Ceníků ✅

- **Kontext**: Ceníky neukazovaly limity pro AI obrázky a X posty. Uživatelé neměli přehled, kolik kreditů jejich tarif obsahuje.
- **Změny**:
  - ✅ i18n (cs/en/uk): Nové klíče `aiImages`, `xAutoPosts` v namespace `landing.pricing` a `dashboard`.
  - ✅ `src/components/marketing/pricing-section.tsx': Do všech tří tarifů (Free/Creator/Pro) přidány řádky AI obrázky a X automatické posty.
  - ✅ `src/app/[locale]/(dashboard)/settings/billing/page.tsx': Stejné řádky na stránce Fakturace.
- **Ověření**: `npx tsc --noEmit` ✅ (4 pre-existing).

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
