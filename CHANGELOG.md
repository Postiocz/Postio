# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0).




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
