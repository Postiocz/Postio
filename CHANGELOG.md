# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🎬 Prompt 062 – KROK 1: TikTok Video Scénář (App Review) ✅

- **Kontext**: TikTok vyžaduje pro opuštění sandboxu demo video s propojením účtu, výběrem videa, nastavením soukromí a publikací.
- **Změny**:
  - ✅ Nová složka `docs/` a soubor `docs/tiktok-review-script.md` – 8scénový anglický screencast scénář (login → connect OAuth → výběr videa → privacy → publish → verifikace → wrap-up) s kontrolním checklistem.
  - ✅ Scénář vychází z reálného chování aplikace: PKCE OAuth přes `/api/accounts/tiktok`, Content Posting sekvence (creator_info → init → upload → status/fetch), privacy `PUBLIC_TO_EVERYONE` default, sandbox fallback na `SELF_ONLY` a Launch Guard pro `@postio-app.cz`.
- **Ověření**: Scénář manuálně prostudován a potvrzen uživatelem (odpovídá reálnému chování aplikace).

### 🚀 Prompt 032 – KROK 3: Robustní konstrukce URL adres ✅

- **Kontext**: Přihlášení funguje, ale kopírovali jsme riziko pádu na chybě "Failed to construct URL" při špatně nastaveném `NEXT_PUBLIC_APP_URL`.
- **Změny**:
  - ✅ `getRedirectBaseUrl()` v `src/lib/actions/auth.ts`: sjednocuje konstrukci base URL (validní `NEXT_PUBLIC_APP_URL` s http(s) → request host header → `http://localhost:3000`), normalizuje trailing slash.
  - ✅ Stejná pojistka v `google-signin-button.tsx` (klient) s fallbackem na `window.location.origin`.
  - ✅ `console.warn("DEBUG: Base URL used for redirect:", ...)` před každým `new URL(...)` — u Google loginu, email signupu i resetu hesla.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (DEBUG log v konzoli, čisté odkazy v e-mailech bez `//`).

### 🚀 Prompt 045 – Rozšíření BETA přístupu (Launch Guard) ✅

- **Kontext**: Revizoři Facebooku a TikToku potřebují plný přístup k BETA platformám (TikTok, Facebook, Instagram) pro otestování aplikace.
- **Změny**:
  - ✅ `src/app/[locale]/(dashboard)/accounts/page.tsx`: Launch Guard (Prompt 044) nově odemyká sandbox platformy i pro uživatele s e-mailem končícím `@postio-app.cz` (vedle `role === 'admin'`); u privilegovaných uživatelů se skrývá badge BETA i disabled stav.
  - ✅ E-mail se čte z `auth.users` přes `supabase.auth.getUser()` (`public.users` e-mail neobsahuje).
  - ✅ Konzistence: server-side OAuth routy (TikTok/X/LinkedIn) žádný sandbox blok nemají – jediná kontrola Launch Guardu zůstává v UI, jak bylo původně.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (přihlášení pod účtem `@postio-app.cz` → platformy FB/IG/TikTok odemčené).

### 🚀 Prompt 060 – KROK 2-5: Ovládací centrum uživatele ✅

- **Kontext**: Sekce "Správa kreditů" v `/admin/users/[id]` povýšena na ovládací centrum – manuální notifikace, správa účtu, plný audit zásahů.
- **Změny**:
  - ✅ Server actions: `sendLowCreditsAlert` (volá `sendLowCreditsEmail` s aktuálními daty z DB), `resetUserPassword`, `setUserActive` (is_active + odhlášení); audit_logs nově včetně `performed_by` (kdo zásah provedl) – doplněno i do `updateUserRole`/`updateUserCredits`.
  - ✅ UI: tlačítko "Odeslat upozornění" v sekci kreditů + "Rychlé akce" (reset hesla, deaktivace/aktivace) – AlertDialog, Tooltip, toasty; nový shadcn `alert-dialog.tsx`; indikátor jazyka uživatele v profilové kartě.
  - ✅ Oprava resetu hesla: client stránka `/(locale)/auth/recovery` zpracuje `#access_token` hash (server fragment nevidí); sdílený `sendPasswordResetEmail` (generateLink + custom mail); `LocaleSwitcher` persistuje jazyk → e-maily v jazyce uživatele (cs/en/uk).
  - ✅ Migrace `054` – view `audit_logs_local` (pravý čas); lokalizace cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅. Manuálně potvrzeno uživatelem (tlačítka, reset → formulář, jazyk en/uk, `performed_by` v audit logu, view spuštěné).

### 🚀 Prompt 060 – KROK 1: Admin User Control – databáze (migrace 053) ✅

- **Kontext**: Ovládací centrum uživatele v adminu (manuální notifikace, deaktivace účtu, audit zásahů) potřebuje databázovou základnu.
- **Změny**:
  - ✅ Migrace `053_admin_user_control.sql`: `users.is_active` (BOOLEAN, default true); `audit_logs.performed_by` (FK → users) + index.
  - ✅ `src/lib/supabase/types.ts`: sync Row/Insert/Update pro `users.is_active` a `audit_logs.performed_by`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Migrace spuštěna v Supabase, potvrzeno uživatelem.

### 🚀 Prompt 059 – KROK 3+4: E-mailová šablona šablona varování + lokalizace ✅

- **Kontext**: Uživatelé s nízkým stavem kreditů neměli e-mailové varování s odkazem na dokoupení.
- **Změny**:
  - ✅ `email.ts`: refaktor bitmap HTML kostry do sdíleného `buildPostioEmailShell` (výstup `buildReferralRewardEmailHtml` beze změny); nová `buildLowCreditsEmailHtml` + `sendLowCreditsEmail` (lokalizovaná, best-effort, `noreply@`, interpolace `{aiRemaining}`/`{twitter...}` do textu, CTA tlačítko → Fakturace).
  - ✅ Reálné odeslání otestováno dočasným debug endpointem `/api/debug/email-test` (2/10 AI, 5/10 X), skečový soubor po otestu odstraněn.
  - ✅ Lokalizace cs/en/uk: `email.lowCredits` (subject, title, body, cta); grafy čerpání (`usage`) a notifikace (`settings.*`) v rámci KROKU1/2.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). E-mail doručen, vzhled + dosazování čísel potvrzeno uživatelem.


### 🚀 Prompt 059 – KROK 2: Nastavení notifikací ✅

- **Kontext**: Uživatelé neměli možnost zapnout e-mailová upozornění na docházející kredity a týdenní souhrn čerpání.
- **Změny**:
  - ✅ Migrace `052_email_notification_preferences.sql`: sloupce `email_low_credit_alert` + `email_weekly_summary` (BOOLEAN, default false) do `users`; `types.ts` Row/Insert/Update.
  - ✅ `preferences-form.tsx`: nová karta "E-mailová upozornění" se 2 shadcn Switch přepínači (low-credit alert <20 %, týdenní souhrn), konzistentní glassmorphism UI s ostatními kartami.
  - ✅ `updatePreferences` (actions.ts) ukládá oba přepínače; `preferences/page.tsx` je načítá a předává do formu.
  - ✅ Lokalizace cs/en/uk (`notificationsSection`, `lowCreditAlert`, `weeklySummary` + popisky).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Migrace spuštěna v Supabase, manuální test potvrzen (uložení + přetrvání stavu).

### 🚀 Prompt 059 – KROK 1: Widget čerpání (Usage Dashboard) ✅

- **Kontext**: Uživatelé neměli přehled o zbývajících kreditech (AI, X auto-post) a počtu účtů v rámci svého tarifu.
- **Změny**:
  - ✅ Nový server komponent `usage-dashboard.tsx` na Fakturaci – sekce "Aktuální čerpání" se 3 progress bary (AI kredity, X kredity, připojené účty).
  - ✅ Limity z aktuálního plánu (`pricing_plans` – custom instance před master fallbackem), kredity z `users.ai_credits` / `twitter_auto_credits`, počet účtů přes `getAccountLimitInfo`.
  - ✅ Při zbývajících ≤20 % se bar zbarví do oranžova. Pro tarif s neomezeným limitem (∞) se bar nezobrazuje.
  - ✅ Lokalizace cs/en/uk (`usage*` klíče v `billing` namespace).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 057 – KROK 1-4: Kreditní strážce (Credit Gating) ✅

- **Kontext**: Ochrana byznys modelu - drahé funkce (AI obrázky, X auto-post) nesmí být použitelné bez kreditu.
- **Změny**:
  - ✅ KROK1 - `ai-assistant-button.tsx`: položka "Generovat obrázek" je `<Link>`; při `ai_credits <= 0` zašedlá + varovný text s odkazem na Fakturaci (`?reason=ai_credits`), informativní toast s tlačítkem "Rozumím" (7s).
  - ✅ KROK2 - `posts/new/page.tsx` + `edit-post-dialog.tsx`: X direct účet disabled při `twitter_auto_credits <= 0` (tooltip + auto-odvybrání vybraného direct účtu), odkaz "Koupit kredity" → Fakturace (`?reason=twitter_credits`), toast s tlačítkem "Rozumím".
  - ✅ KROK3 - Server-side guard: `generate-image/route.ts` blokuje 402 při `ai_credits <= 0` (před voláním API); `publish.ts` blokuje X direct při `twitter_auto_credits <= 0`. Odečty jsou atomické (`.gte(col, 1)`) - eliminace race-condition u souběžných requestů (obě X větve + AI).
  - ✅ KROK4 - Lokalizace cs/en/uk: `ai.aiLimitExhausted`, `ai.aiLimitToast`, `ai.aiBuyMore`, `ai.aiGotIt`, `accounts.xConnect.buyCredits`, `accounts.xConnect.gotIt`, `billing.aiCreditsToast`, `billing.twitterCreditsToast`.
  - ✅ Dodatečně - AI generování převedeno z DALL-E3 → `gpt-image-1` (DALL-E3 byl v roce 2026 vyřazen): model vrací `b64_json`, obrázek se ukládá do Supabase Storage (`post-media`) a vrací public URL; route přepnuta na `nodejs` kvůli `Buffer`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). AI Štětec otestován (generování gpt-image-1 + Storage + odečet kreditu). X direct technicky potvrzeno (bez nákladného API testu). Light/Dark potvrzen.

### 🚀 Prompt 055 – KROK 4: Sjednocení UI ✅

- **Kontext**: Finální prověrka konzistence Admin UI po implementaci Light Mode.
- **Změny**:
  - ✅ Automatická kontrola: 0 nalezených inkonzistencí v `rounded-*`, `backdrop-blur-*` nebo `border-white/10` bez `dark:` varianty napříč všemi admin stránkami.
  - ✅ Ověřeno: Sidebar, Header, tabulky, MetricCard, karty – všechny používají konzistentní `rounded-[20px]`, `backdrop-blur-md`, glassmorphism pattern.
  - ✅ Theme-aware přepínání Light/Dark potvrzeno v celém Adminu.
- **Ověření**: Automatická kontrola + manuální test potvrzen.


