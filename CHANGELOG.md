# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).


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

### 🚀 Prompt 055 – KROK 3: Premium Glow Efekt (Refix v2) ✅

- **Kontext**: Původní glow byl příliš silný ("rozmazaný mrak") a v Light Mode téměř neviditelný. Refix pro High-End vzhled.
- **Změny**:
  - ✅ `src/app/globals.css`: Nová animace `glow-breathe` (6s ease-in-out, ±0.02 opacity, `prefers-reduced-motion` safe).
  - ✅ `billing-card.tsx` + `pricing-client.tsx`: Master-only glow (`creator`/`pro`):
    - Light Mode: `shadow-[0_20px_50px_rgba(99,102,241,0.15)]` + pastel rainbow gradient `from-indigo-300 via-purple-300 via-pink-300 to-amber-300`, `blur-[30px]`, `opacity-[0.03]`, `glow-breathe`.
    - Dark Mode: `shadow-[0_0_40px_rgba(99,102,241,0.3)]` + `dark:before:opacity-[0.12]`.
    - Border: `border-indigo-500/20 dark:border-indigo-500/30`.
    - Promo/ostatní recommended: pouze jemný stín bez gradientu.
- **Ověření**: Manuální test Light/Dark potvrzen — glow je decentní, prémiový, ne ruší čtení.

### 🚀 Prompt 055 – KROK 2: Inteligentní Kontrast Odznaků ✅

- **Kontext**: Odznaky tarifů s dynamickou barvou (`badgeColor` z DB) měly hardcoded `text-white` — na světlém pozadí nečitelné.
- **Změny**:
  - ✅ `src/lib/utils.ts`: Nová utilita `getContrastTextColor(bgColor)` — WCAG luminance výpočet, vrací `text-slate-900` pro světlé pozadí, `text-white` pro tmavé.
  - ✅ `src/components/marketing/pricing-client.tsx`: Odznak doporučeného tarifu používá `getContrastTextColor(plan.badgeColor)` místo hardcoded `text-white`.
- **Ověření**: Manuální test potvrzen — světlé barvy odznaku → tmavý text, tmavé barvy → bílý text.

### 🚀 Prompt 055 – KROK 1: Admin Light Mode ("Milky Glass") ✅

- **Kontext**: Admin sekce (`/admin/*`) byla hardcodována pro Dark Mode — bílé texty na bílém pozadí v Light Modu nečitelné.
- **Změny**:
  - ✅ Core komponenty (5 souborů): `admin/layout.tsx`, `admin-sidebar.tsx`, `admin-header.tsx`, `metric-card.tsx`, `admin/billing/page.tsx` — `bg-white/80 dark:bg-[#09090b]/80`, `border-slate-200 dark:border-white/10`, `text-slate-900 dark:text-white`.
  - ✅ Všechny ostatní admin stránky (12 souborů): Dashboard, Analytics, Billing/Plans, Feedback, Posts, Settings (3×), System Check, Users (2×) — hromadná oprava `text-white` → `text-slate-900 dark:text-white`, `text-gray-*` → `text-slate-* dark:text-gray-*`, `bg-[#09090b]/80` → `bg-white/80 dark:bg-[#09090b]/80`.
  - ✅ `STATUS_COLORS`/`PLAN_COLORS` maps: `bg-{color}-500/20` → `bg-{color}-100 dark:bg-{color}-500/20` (7 souborů).
  - ✅ Hover stavy, divide, placeholder, accent ikony — vše theme-aware.
- **Ověření**: 0 zbývajících hardcoded dark-only barev v adminu. Manuální test Light/Dark potvrzen.

### 🚀 Prompt 058 – Granulární viditelnost (Visibility Rules) ✅

- **Kontext**: Nahrazení hrubého flagu `is_new_user_only` flexibilním systémem cílených skupin (`visibility_rules` TEXT[]).
- **Změny**:
  - ✅ Krok 1 – Migrace `051_visibility_rules.sql` (sloupec + backfill + GIN index), `types.ts`.
  - ✅ Krok 2 – Admin UI checkboxy "Kdo uvidí tento plán?" + Server Actions ukládají pole (překlady cs/en/uk).
  - ✅ Krok 3 – Landing page session-aware (přihlášený→tarif, odhlášený→anonymous); Fakturace `.contains(visibility_rules,[userPlan])`; nav pozná přihlášeného.
  - ✅ Krok 4 – Checkout API ověřuje `visibility_rules` (403), promo plány `['anonymous','free']`.
  - ✅ Krok 5 – Smart Pricing Cards (přímý checkout pro přihlášené, spinner); měna dle aktivního předplatného.
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test potvrzen.

### 🚀 Prompt 054 – KROK 2+3: Snapshot Logic a ochrana master šablon ✅

- **Kontext**: Chybela vazba uživatele na instanci plánu (snapshot) a master šablony šlo smazat.
- **Změny**:
  - ✅ Krok 2 – `checkout` předává `plan_instance_id`; `webhook` zapisuje `current_plan_instance_id`; migrace `050` = backfill + trigger auto-Free.
  - ✅ Krok 3 – Server `deletePricingPlan` blokuje `is_master_template`; UI koš jen `is_custom && !is_master_template`.
- **Ověření**: `npx tsc --noEmit` ✅. Backfill ověřen v DB; smazání master zablokováno, custom funguje. Prompt054 celý hotán.

### 🚀 Prompt 054 – KROK 1: Redukce Master Modálu + dynamický ceník ✅

- **Kontext**: Master šablony (Free/Creator/Pro) byly na landing page hardcoded, takže přepínač "Veřejný web" u nich neměl efekt.
- **Změny**:
  - ✅ `plans-client.tsx`: u master šablon se skryjí promo/flash sale sekce, zůstává jen "Veřejný web" (odstraněna duplicita s `PlanInputs`).
  - ✅ `pricing-section.tsx`: dynamické načítání master plánů z DB s respektováním `is_public`, pořadí Free→Creator→Pro, lokalizace dle locale, hardcoded fallback.
  - ✅ DB: master plánům nastaveno `is_public = true` (dříve false).
- **Ověření**: `npx tsc --noEmit` ✅ (bez chyb). Manuální test zapnutí/vypnutí plánu potvrzen.

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

