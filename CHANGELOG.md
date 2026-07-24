# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).


### 🚀 Prompt 044-REVISED – KROK 3: Ochrana logů a soukromí ✅

- **Kontext**: Produkční aplikace nesmí vypisovat citlivá data do konzole prohlížeče.
- **Změny**:
  - ✅ `src/app/auth/callback/route.ts`: 15+ `console.log` → `logger.debug`/`logger.info`.
  - ✅ `src/app/[locale]/(dashboard)/layout.tsx`: `console.log` → `logger.debug`.
  - ✅ `src/lib/email.ts`: `console.warn` → `logger.warn`.
  - ✅ `src/lib/image-compression.ts`: 3× `console.warn` → `logger.warn`/`logger.info`.
  - ✅ `src/lib/actions/publish-twitter.ts`: 6× `console.log`/`console.warn` → `logger`.
  - ✅ `src/lib/actions/publish-youtube.ts`: 2× `console.log` → `logger`.
  - ✅ `src/lib/actions/publish-tiktok.ts`: 2× `console.warn`/`console.log` → `logger`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 044-REVISED – KROK 2: Admin Credit Manager ✅

- **Kontext**: Admin potřebuje manuálně spravovat kredity uživatelů (AI obrázky, X posty).
- **Změny**:
  - ✅ `src/modules/admin-core/actions.ts`: Nová funkce `updateUserCredits()` s zápisem do `audit_logs`.
  - ✅ `src/app/[locale]/(admin)/admin/users/[id]/page.tsx`: UI sekce "Správa kreditů" s inputy a tlačítkem.
  - ✅ `src/lib/supabase/types.ts`: Přidány typy `ai_credits` a `twitter_auto_credits`.
  - ✅ `src/app/[locale]/(admin)/admin/settings/audit-log/page.tsx`: Podpora překladu pro akci `credits_updated`.
  - ✅ i18n (cs/en/uk): Nové klíče `creditsManagement`, `aiCreditsLabel`, `twitterCreditsLabel`, `actionCreditsUpdated`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 044-REVISED – KROK 1: Launch Guard ✅

- **Kontext**: Před prvním launchem je třeba skrýt sandbox platformy (TikTok, Facebook, Instagram) před běžnými uživateli.
- **Změny**:
  - ✅ `src/app/[locale]/(dashboard)/accounts/page.tsx`: Nová konstanta `SANDBOX_PLATFORMS`, načítání `userRole`, BETA badge u sandbox platforem.
  - ✅ Logika: Admin může propojit vše, běžný uživatel vidí disabled tlačítka s tooltipem "Právě probíhá schvalování sítě...".
  - ✅ i18n (cs/en/uk): Nový klíč `sandboxDisabledTooltip` v namespace `accounts`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 044 – KROK 5: SEO a OpenGraph Finalizace ✅

- **Kontext**: OpenGraph metadata byla jen v češtině a chyběla lokalizace pro en/uk.
- **Změny**:
  - ✅ `src/app/[locale]/layout.tsx`: Přidána `generateMetadata` s lokalizovaným OpenGraph/Twitter title, description a obrazkem (`hero-mockup_{locale}.png`).
  - ✅ `src/app/layout.tsx`: Odstraněna tvrdě kódovaná OG metadata (přesunuta do locale layoutu).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb).

### 🚀 Prompt 044 – KROK 1: Produkční UI a hlášky ✅

- **Kontext**: V překladech se vyskytovaly technické názvy ("Sandbox") a duplicitní záznamy.
- **Změny**:
  - ✅ Přejmenován klíč `tiktokSandboxPrivateOnlyError` → `tiktokUnauditedPrivateOnlyError` (cs/en/uk).
  - ✅ Odstraněny duplicitní TikTok bloky v `cs.json`, `en.json`, `uk.json`.
  - ✅ Aktualizovány reference ve 3 komponentách (edit-post-dialog, posts/new, posts/[id]).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb).

### 🚀 Prompt 044 – KROK 3: Admin System Check ✅

- **Kontext**: Před ostrým startem chyběl přehledný dashboard pro kontrolu stavu API připojení (Stripe, OpenAI, TikTok atd.).
- **Změny**:
  - ✅ `src/modules/admin-core/actions.ts`: Nová funkce `getSystemStatus()` kontrolující všech 9 API služeb.
  - ✅ `src/app/[locale]/(admin)/admin/system-check/page.tsx`: Nová stránka `/admin/system-check` s přehledem "Připojeno/Nepřipojeno" a vizuálními indikátory.
  - ✅ `src/modules/admin-core/components/admin-sidebar.tsx`: Přidán odkaz "System Check" do admin navigace.
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
  - ✅ `supabase/functions/process-scheduled-posts/index.ts`: Přidány helpery `getCronSecret()` a `checkCronSecret()` pro ověření `Authorization: Bearer [CRON_SECRET]` hlavičky. CRON_SECRET je kontrolován jako první auth metoda; pokud není nastaven, funkce funguje zpětně kompatibilně.
  - ✅ `supabase/config.toml`: Přidán komentář o nutnosti nastavit `CRON_SECRET` v Supabase Dashboard.
- **Ověření**: Externí cron-job.org vrací 200 OK ✅.

### 🚀 Prompt 043-C – KROK 7: Lokalizace (i18n) – kreditové hlášky ✅

- **Kontext**: Chybové hlášky o nedostatku X kreditů byly natvrdo v češtině. Chyběly i18n klíče pro UI hlášky.
- **Změny**:
  - ✅ i18n (cs/en/uk): Nový klíč `xConnect.noCredits` v namespace `accounts`.
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx`: `resolvePublishErrorMessage` kontroluje X kredit error a vrací lokalizovanou hlášku.
  - ✅ `src/components/edit-post-dialog.tsx`: Stejná logika v `resolveLocalizedPublishError`.
- **Ověření**: `npx tsc --noEmit` ✅ (4 pre-existing).

### 🚀 Prompt 043-C – KROK 6: Aktualizace Ceníků ✅

- **Kontext**: Ceníky neukazovaly limity pro AI obrázky a X posty. Uživatelé neměli přehled, kolik kreditů jejich tarif obsahuje.
- **Změny**:
  - ✅ i18n (cs/en/uk): Nové klíče `aiImages`, `xAutoPosts` v namespace `landing.pricing` a `dashboard`.
  - ✅ `src/components/marketing/pricing-section.tsx`: Do všech tří tarifů (Free/Creator/Pro) přidány řádky AI obrázky a X automatické posty.
  - ✅ `src/app/[locale]/(dashboard)/settings/billing/page.tsx`: Stejné řádky na stránce Fakturace.
- **Ověření**: `npx tsc --noEmit` ✅ (4 pre-existing).

### 🚀 Prompt 043-C – KROK 5: UI Indikátory kreditů v Editoru ✅

- **Kontext**: Uživatelé neviděli zbývající kredity pro AI obrázky a X posty. Chyběla vizuální indikace v editoru.
- **Změny**:
  - ✅ `src/app/api/accounts/route.ts`: GET vrací `{ accounts, credits }` s `ai_credits` a `twitter_auto_credits`.
  - ✅ `src/components/ai-assistant-button.tsx`: Nová prop `aiCredits`, badge 🎨 u „Generovat obrázek" v dropdown menu (text-[10px]).
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx`: Načtení kreditů z API, badge ⚡ u Twitter platformy, předání `aiCredits` do AIAssistantButton.
  - ✅ `src/components/edit-post-dialog.tsx`: Stejné indikátory jako v new/page.tsx.
- **Ověření**: `npx tsc --noEmit` ✅ (žádné nové chyby, pouze 4 pre-existing).
