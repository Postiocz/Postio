# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).


### 🚀 Prompt 044-REVISED – KROK 4.4: Admin Feedback View ✅

- **Kontext**: Admin potřebuje přehled o všech zpětných vazbách od uživatelů.
- **Změny**:
  - ✅ `src/app/[locale]/(admin)/admin/feedback/page.tsx`: Nová stránka s přehledem feedbacků.
  - ✅ `src/modules/admin-core/components/admin-sidebar.tsx`: Odkaz "Zpětná vazba" v admin navigaci.
  - ✅ `src/lib/actions/feedback.ts`: `getFeedbackList()` a `updateFeedbackStatus()` s admin klientem.
  - ✅ i18n (cs/en/uk): Namespace `adminFeedbackPage` + klíč `nav.adminFeedback`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 044-REVISED – KROK 4.2: Feedback Modal UI ✅

- **Kontext**: Uživatelé potřebují snadný způsob, jak poslat zpětnou vazbu přímo z aplikace.
- **Změny**:
  - ✅ `src/components/feedback-modal.tsx`: Nový Glassmorphism modal s formulářem (typ + zpráva).
  - ✅ `src/components/dashboard/sidebar.tsx`: Tooltip u odkazu "Zpětná vazba", změna z mailto na modal.
  - ✅ `src/components/dashboard/feedback-sidebar-wrapper.tsx`: Client wrapper pro integraci modalu.
  - ✅ `src/lib/actions/feedback.ts`: Server action `submitFeedback()`.
  - ✅ `src/components/ui/select.tsx`: Přidána chybějící Select komponenta.
  - ✅ i18n (cs/en/uk): Nový namespace `feedback` s překlady pro modal.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

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
