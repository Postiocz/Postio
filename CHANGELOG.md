# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).


### 🚀 Prompt 057 – KROK 1 + fix promo/odpočtu ✅

- **Kontext**: Stávající uživatelé viděli akční nabídky určené jen pro nové uživatele; navíc běžel odpočet i u ne-promo plánů se zbytkovým `active_until`.
- **Změny**:
  - ✅ Migrace `049_add_new_user_only.sql`: sloupec `is_new_user_only BOOLEAN DEFAULT false` + backfill (`is_promo = true` → `is_new_user_only = true`) + index.
  - ✅ `src/lib/supabase/types.ts`: `is_new_user_only` přidáno do Row/Insert/Update.
  - ✅ Landing page zobrazuje custom plány jen `is_public = true` (`pricing-section.tsx`).
  - ✅ "Veřejný web" přepínač dostupný pro všechny custom plány v Adminu (ne jen promo).
  - ✅ Odpočet se renderuje JEN pro promo plány (`plan.isPromo && plan.activeUntil`).
  - ✅ Vypnutí promo v Adminu vymaže `active_from`/`active_until`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Migrace spuštěna v Supabase, fix odpočtu test potvrzen.

### 🚀 Prompt 056 – KROK 1+2+3: Fix řazení plánů a UI varování ✅

- **Kontext**: Fakturace zobrazovala plány přeházeně a konzole hlásila a11y + Recharts varování.
- **Změny**:
  - ✅ Krok 1 – Řazení ve Fakturaci: Free → Master Creator → Master Pro → všechny viditelné custom plány chronologicky podle `created_at` (`billing/page.tsx`).
  - ✅ Krok 2 – Do všech 14 dialogů přidán `<DialogDescription className="sr-only">` (screen-reader, vizuálně skrytý).
  - ✅ Opravena rozbitá struktura v `tag-breakdown.tsx` a duplicitní popisky v `setup-2fa-dialog.tsx`.
  - ✅ Krok 3 – Chart warnings potlačeny: `isMounted` render po mountu + `min-h` kontejnery + `minWidth={0}`/`minHeight={0}` na `ResponsiveContainer` (3 soubory).
  - ✅ Dodatečně: donut chart `height="100%"` → `height={176}` (číselná výška, eliminace `-1×-1` warningu na dashboardu).
  - ✅ Dodatečně: `/api/proxy/image` route + sdílená utilita `proxyImageUrl()` aplikovaná v 9 komponentách – žádné 403 v konzoli u vypršelých CDN URL (allow-list: fbcdn, cdninstagram, licdn, twimg, tiktokcdn, ggpht, googleusercontent, ytimg).
  - ✅ Krok 4 – Do všech 15 `<video>` elementů přidán `<track kind="captions" />` (HTML5 standard).
  - ✅ Odstraněny debug logy z `pending-plan-handler.tsx` (nákupní paměť zůstává funkční).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 054/055 – Stripe Sync a nákupní paměť vlastních plánů ✅

- **Kontext**: Vlastní plány potřebovaly nezávislé Stripe ceny a zachování záměru nákupu přes přihlášení, onboarding i vytvoření prvního příspěvku.
- **Změny**:
  - ✅ Kroky 1–2 – Unikátní lookup_keys (`plan_{id}_{currency}`) a izolovaná Stripe synchronizace vlastních plánů.
  - ✅ Krok 3 – `/api/stripe/checkout` přijímá master typ i UUID vlastního plánu a načítá správnou Stripe cenu.
  - ✅ Krok 4 – Landing Page ukládá vybraný tarif do cookie; `PendingPlanHandler` v dashboard layoutu po navigaci bezpečně obnoví nákup a přesměruje na Stripe.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test syncu, checkoutu UUID i nákupní paměti potvrzen.

### 🚀 Prompt 048 – Dynamické plány s ochranou výchozích hodnot (KROK 1-7) ✅

- **Kontext**: Převod správy tarifů do databáze s ochranou původních hodnot jako nedotknutelného základu.
- **Změny**:
  - ✅ `src/lib/constants/original-plans.ts`: Hardcoded backup původních cen a limitů (Free/Creator/Pro).
  - ✅ `supabase/migrations/044_create_pricing_plans.sql`: Nová tabulka `pricing_plans` s partial unique indexem pro ochranu master templates.
  - ✅ `supabase/migrations/045_extend_pricing_plans.sql`: Rozšíření o `is_visible`, `is_custom`, `max_subscriptions`, `current_subscriptions`, `name_en`, `name_uk`.
  - ✅ `src/lib/supabase/types.ts`: Přidány TypeScript typy pro `pricing_plans` a `feedback`.
  - ✅ `src/lib/actions/pricing-plans.ts`: Server actions pro správu tarifů (getAll, update, resetSinglePlanToMaster).
  - ✅ `src/app/[locale]/(admin)/admin/billing/plans/page.tsx`: Nová admin stránka pro správu tarifů.
  - ✅ `src/app/[locale]/(admin)/admin/billing/plans/plans-client.tsx`: Klient komponenta s editačním dialogem a reset tlačítky.
  - ✅ `src/modules/admin-core/components/admin-sidebar.tsx`: Přidán odkaz "Správa tarifů" s ikonou Tags.
  - ✅ i18n (cs/en/uk): Nový namespace `adminBillingPlansPage` + navigační klíče + `resetSingleConfirm`.
  - ✅ Reset k základu pro každý tarif zvlášť s potvrzovacím dialogem.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 047 – Mobilní admin menu s dropdownem ✅

- **Kontext**: Mobilní lišta adminu měla jen 5 fixních ikon, chyběly odkazy na Analytiku, Zpětnou vazbu a System Check.
- **Změny**:
  - ✅ `src/modules/admin-core/components/admin-mobile-nav.tsx`: Přidáno dropdown menu "Ostatní" s přehledem všech dalších funkcí.
  - ✅ `src/app/[locale]/(admin)/admin/settings/page.tsx`: Přidáno tlačítko "Zpět do menu" pro mobilní zobrazení.
  - ✅ `src/components/ui/sheet.tsx`: Nová Sheet komponenta (vytvořena, nepoužita - nahrazeno DropdownMenu).
  - ✅ i18n (cs/en/uk): Nové klíče `nav.adminOther`, `backToMenu`, opraveny překlady v uk.json.
  - ✅ Dropdown menu se automaticky otevře při navigaci z `/admin/settings` přes query param `?menu=open`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 046B – Lokalizace statických textů v náhledech ✅

- **Kontext**: Desítky hardcoded textů v náhledových komponentách ignorovaly přepnutí jazyka (cs/en/uk).
- **Změny**:
  - ✅ i18n (cs/en/uk): 21 nových klíčů v namespace `posts` (previewNow, previewActionLike/Share/Comment atd.)
  - ✅ `src/components/post-preview.tsx`: Všechny hardcoded texty (FB, IG, YT, LI, TT, TW) nahrazeny za `labels` props.
  - ✅ `src/components/preview-dialog.tsx`: Nový `previewLabels` useMemo s `t()`, přidán `labels` parametr do `renderPreviewForPlatform`.
  - ✅ `src/components/edit-post-dialog.tsx`: Hardcoded texty v `renderPlatformPreview` nahrazeny za `t()`.
  - ✅ `src/components/calendar/hover-preview.tsx`: Přidáno `useTranslations`, nahrazen alt text.
  - ✅ Fix: `previewOriginalSound` v JSON zbaven `{name}` placeholderu (FORMATTING_ERROR).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 046 – Twitter/X High-Fidelity Preview ✅

- **Kontext**: V náhledovém systému chyběla podpora pro Twitter/X – chyběla záložka, komponenta i vizuální simulace.
- **Změny**:
  - ✅ `src/components/post-preview.tsx`: Nová `TwitterPreview` komponenta (X dark mode, avatar, verified badge, handle, media `object-contain`, interakční lišta Reply/Retweet/Like/Views/Bookmark/Share). Typ `Platform` rozšířen o `"twitter"`, přidán `twitterProfile` prop, `PLATFORM_ACCENTS` a render logika.
  - ✅ `src/components/preview-dialog.tsx`: `PREVIEWABLE_PLATFORMS` rozšířeno o `"twitter"`, nový case v `renderPreviewForPlatform` s věrným tweet vizuálem, `XToolbarBtn` helper.
  - ✅ `src/components/edit-post-dialog.tsx`: Přidán `twitterProfile` state/loading, `previewTwitterTab` label, `"twitter"` v `availablePreviewPlatforms`, `renderPlatformPreview` case, `twitterProfile` prop do `<PostPreview>`.
  - ✅ i18n (cs/en/uk): Nový klíč `previewTwitterTab: "X (Twitter)"` v namespace `posts`.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

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

