# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🚀 Prompt 037 – KROK 4: Admin Shell (UI) ✅

- **Kontext**: Potřebujeme kompletní admin rozhraní podle design manuálů (Pure Black, 20px radius, glassmorphism).
- **Změny**:
  - **admin-sidebar.tsx**: Navigace s ikonami (Dashboard, Uživatelé, Příspěvky, Analytika, Nastavení), glassmorphism `bg-[#09090b]/80`, `rounded-[20px]` pro položky, aktivní stav s púlnicovým svitem.
  - **admin-header.tsx**: Search input s ikonou, LocaleSwitcher + ThemeToggle vpravo.
  - **metric-card.tsx**: Glassmorphism karta s ikonou, hodnotou a glow efektem. `rounded-[20px]`, `bg-[#09090b]/80`.
  - **Admin layout**: Kompletní shell – sidebar + header + main s grid patternem a purple glowem. Pure Black pozadí.
  - **Admin page**: 4 metric karty (Celkem uživatelů, Zaplacení, Celkem příspěvků, Dnešní tržby).
- **Ověření**: `npx tsc --noEmit` ✅. `npx next build` ✅.
- **Upravené soubory**: `admin-sidebar.tsx` (nová), `metric-card.tsx` (nová), `admin-header.tsx` (nová), `(admin)/layout.tsx` (upraven), `(admin)/admin/page.tsx` (upraven), `ukol.md`, `CHANGELOG.md`.

### 🚀 Prompt 037 – KROK 1–3: Inicializace Admin Core (balíček, DB role, guard) ✅

- **Kontext**: Potřebujeme izolovaný, znovupoužitelný framework pro administraci, oddělený od hlavní aplikace, ale sdílející DB a auth.
- **Změny**:
  - **packages/admin-core**: Nový balíček s typy (`types.ts` – `UserRole`, `AdminConfig`, `AdminGuardResult`), konfigurací (`admin-config.ts` – `postioAdminConfig`), guard helper (`guard.ts` – `checkAdminAccess()`), a hlavním exportem (`index.ts`). Přidán path alias `admin-core` do `tsconfig.json`.
  - **DB migrace** (`041_add_admin_role_and_audit_logs.sql`): Přidán sloupec `role` (TEXT, default 'user', CHECK 'user'/'admin') do `public.users`. Vytvořena tabulka `audit_logs` s `user_id`, `action`, `target_table`, `target_id`, `metadata` (JSONB), `created_at`. Nastaven RLS – pouze admin může číst/vkládat/mažat audit logy.
  - **TypeScript typy** (`types.ts`): Přidán `role` do `users.Row/Insert/Update`. Přidána tabulka `audit_logs` s kompletními typy.
  - **Admin route** (`src/app/[locale]/(admin)/`): Layout s `checkAdminAccess()` guardem, který přesměrovává ne-adminy na `/login`. Vstupní stránka `admin/page.tsx` ukazuje počet uživatelů.
- **Ověření**: `npx tsc --noEmit` ✅. `npx next build` ✅ (admin route `/[locale]/admin` zahrnut).
- **Upravené soubory**: `041_add_admin_role_and_audit_logs.sql` (nová), `types.ts`, `tsconfig.json`, `packages/admin-core/src/types.ts` (nová), `packages/admin-core/src/admin-config.ts` (nová), `packages/admin-core/src/guard.ts` (nová), `packages/admin-core/src/index.ts` (nová), `packages/admin-core/package.json` (nová), `(admin)/layout.tsx` (nová), `(admin)/admin/page.tsx` (nová), `ukol.md`, `CHANGELOG.md`.

### 📬 Prompt 034 – Revize: Branded e-maily + Onboarding Checklist ✅

- **Kontext**: Potvrzovací e-mail po registraci chodil v angličtině (Supabase built-in template přes Custom SMTP). Welcome e-mail nedorazil. Dashboard chyběl průvodce pro nové uživatele.
- **Změny**:
  - **Signup flow**: `supabase.auth.signUp()` nahrazen `admin.generateLink({ type: "signup" })` + vlastní brandovaný, lokalizovaný e-mail (Pure Black, glassmorphism, indigo CTA) z `noreply@postio-app.cz` – stejný vzor jako reset hesla. Lokalizace cs/en/uk dle URL.
  - **Welcome email fix**: `sendWelcomeEmail()` přestal používat `admin.auth.admin.getUserById()` (padal na chybějící `SUPABASE_SERVICE_ROLE_KEY`). E-mail se předává přímo z `signUp()`.
  - **Referral reward email**: Nový `buildReferralRewardEmailHtml()` v `email.ts` – brandovaná šablona pro e-mail o odměně.
  - **Referral reward logic**: `applyReferral()` rozšířen o automatické udělení 30 dní PRO (migrace `040_add_plan_expires_at`). `rewardReferrer()` – free → pro, paid → +30 dní k expiraci.
  - **Onboarding Checklist**: Nová `src/components/onboarding-checklist.tsx` – plovoucí glassmorphism karta (fixed bottom-right). 3 kroky: účet → propojit síť → první příspěvek. Automatická detekce stavu z DB. Lokalizace cs/en/uk.
  - **UI odměn**: Karta "Získané odměny" na stránce Doporučení ukazuje reálný stav plánu ("Aktivní do {date}") místo statického čísla.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (registrace cs/en/uk – lokalizovaný potvrzovací e-mail z noreply@postio-app.cz, welcome z hello@postio-app.cz).
- **Upravené soubory**: auth.ts, referral.ts, email.ts, page.tsx (referrals), referral-stats.tsx, onboarding-checklist.tsx (nová), page.tsx (dashboard), cs.json, en.json, uk.json, 040_add_plan_expires_at.sql (nová), ukol.md, CHANGELOG.md.

### 📧 Prompt 036-B: Lokalizace reset e-mailu dle jazyka uživatele + oprava override ✅

- **Kontext**: Reset e-mail chodil vždy v češtině, i když byl uživatel na `/en/login`. Příčina: DB lookup na `public.users.language` (KROK 3B) přepsal `locale="en"` z formuláře hodnotou `"cs"` z DB.
- **Změna**: `auth.ts` – odstraněn DB lookup `language` z `resetPasswordAction`. Používá se přímo `locale` z formuláře (odvozený z URL v `email-signin.tsx`), což je jazyk, který uživatel právě používá. `footerTagline` přidán do `cs.json`, `en.json`, `uk.json` pod `email.footerTagline`. `buildResetEmailHtml()` nyní přijímá `footerTagline` jako parametr místo hardcoded anglické patičky.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (cs/en/uk dle UI přepínače).
- **Upravené soubory**: auth.ts, cs.json, en.json, uk.json, ukol.md, CHANGELOG.md.

### 📧 Prompt 036 – KROK 3B: Vlastní e-mail pro reset hesla přes Resend ✅

- **Kontext**: `resetPasswordAction` používala `supabase.auth.resetPasswordForEmail()` a spoléhala na Supabase vlastní email. Cíl: odesílat reset emaily vlastním Resendem z `noreply@postio-app.cz` s plnou kontrolou nad obsahem.
- **Změna**: `auth.ts` – `resetPasswordAction` nově používá `adminClient.auth.admin.generateLink({ type: "recovery" })` k vygenerování podepsaného odkazu BEZ odeslání emailu ze Supabase. Sestaví brandovaný HTML email (Pure Black, glassmorphism, indigo CTA) i plaintext fallback. Odešle přes `sendTransactionalEmail()` s `SENDER_NOREPLY`. Přidány helpers `loadLocaleMessages()` (překlady z JSON) a `buildResetEmailHtml()`. Nové importy: `createAdminClient`, `sendTransactionalEmail`, `SENDER_NOREPLY`.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (email dorazil z noreply@postio-app.cz, branded vzhled, funkční link).
- **Upravené soubory**: auth.ts, ukol.md, CHANGELOG.md.

### 📧 Prompt 036 – KROK 1: Systémové adresy v email.ts ✅

- **Kontext**: `email.ts` podporoval pouze jeden sender (info@postio-app.cz). Potřebujeme tři systémové adresy pro odlišení technických, marketingových a obecných e-mailů.
- **Změna**: Přidány 3 exportované konstanty `SENDER_NOREPLY` (noreply@ – technické), `SENDER_HELLO` (hello@ – marketing), `SENDER_INFO` (info@ – výchozí). Rozšířeno `SendEmailOptions` o volitelný `from?: string`. `sendTransactionalEmail()` používá `options.from ?? getFromEmail()`. Zpětná kompatibilita zachována – žádný volající se nemění.
- **Ověření**: `npx tsc --noEmit` ✅ (exit 0). Manuální test ✅.
- **Upravené soubory**: email.ts, ukol.md, CHANGELOG.md.

### 🌐 Prompt 035 – KROK 5: Lokalizace přepínače měn + Free label ✅ (celý Prompt 035 hotový)

- **Kontext**: Přepínač měn měl `aria-label="Měna"` natvrdo (anglický screen reader viděl češtinu) a Free plán zobrazoval hardcodované `"Free"` bez ohledu na locale.
- **Změna**: `currency-switcher.tsx` – `aria-label` přes `useTranslations("common").currencyLabel`. `cs/en/uk.json` – NOVÝ klíč `common.currencyLabel` (Měna / Currency / Валюта). `billing-card.tsx` – Free label `"Free"` → `translations.free`; prop `free` přidané v `billing-client.tsx` + `page.tsx` (hodnota z `t("free")`, cs = "Zdarma"). CZK/EUR/USD kódy zůstávají nelokalizované.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (cs→"Zdarma", aria-label dle locale).
- **Poznámka**: Tím uzavřen celý Prompt 035 (Krok 1–5). Sekce úkolu smazána z ukol.md (Pravidlo 7).
- **Upravené soubory**: currency-switcher.tsx, billing-card.tsx, billing-client.tsx, page.tsx, cs.json, en.json, uk.json, ukol.md.

### 🚀 Prompt 035 – KROK 3+4 dokončení: 6 kombinací měn + Stripe Portal v nové kartě ✅

- **Kontext**: Po přepisu na Lookup Keys padal checkout pro EUR/USD. Příčina: ceny byly založeny jako jedna cena se `currency_options` (CZK základ), ale `session.currency` parametr s nimi nespolupracoval spolehlivě.
- **Řešení (změna přístupu na samostatné klíče)**: Ve Stripe založeno **6 cen**, každá s vlastním lookup keyem: `postio_creator_monthly_{czk,eur,usd}` a `postio_pro_monthly_{czk,eur,usd}` (199/8/9 Kč/€/$, 499/20/22). Backend `route.ts` složí klíč `` `postio_${plan}_monthly_${currency}` `` → `stripe.prices.list({ lookup_keys: [key] })` vrátí přesně jednu cenu; `line_items` bez `currency` (cena nese měnu sama). Odebrány debug logy. Zachována obrana proti neplatnému `stripe_customer_id` (retrieve → při chybě/delete vytvoří nového).
- **Ověření (API + manuál)**: `npx tsc --noEmit` ✅. Přímá Stripe simulace všech 6 kombinací (creator+pro × CZK/EUR/USD) ✅; manuální test uživatele ✅ (brána otevírá správné částky).
- **UX doplněk**: `manage-subscription-button.tsx` – Stripe Customer Portal se nově otevírá v **nové kartě** (`window.open(url, "_blank", "noopener,noreferrer")` místo `window.location.href`).
- **Upravené soubory**: checkout/route.ts, manage-subscription-button.tsx, ukol.md, CHANGELOG.md.

### 🚀 Prompt 035 – KROK 3+4: Multi-currency Stripe Checkout přes Lookup Keys ✅

- **Kontext**: Původní `/api/stripe/checkout` používal natvrdo `STRIPE_PRICE_ID_CREATOR/PRO` (jeden priceId). Cíl: volit cenu podle vybrané měny (CZK/EUR/USD) přes Lookup Keys.
- **KROK 3 (frontend)**: `billing-card.tsx` `handleCheckout` posílá nově `currency` (z prop) spolu s `plan`+`locale` do `/api/stripe/checkout`.
- **KROK 4 (backend)**: `route.ts` – `PLAN_PRICE_IDS` → `LOOKUP_KEYS = { creator: "postio_creator_monthly", pro: "postio_pro_monthly" }`. Nově `stripe.prices.list({ lookup_keys: [lookupKey], active: true })` a `data.find(p => p.currency === currency)` (lowercase ISO 4217 `czk/eur/usd`). `line_items` používá `targetPrice.id`. Přidána validace `currency ∈ {czk,eur,usd}` (default `eur`) a chyba při chybějící ceně. Env `STRIPE_PRICE_ID_*` se už nečte.
- **Ověření (docs + manuál)**: `npx tsc --noEmit` ✅. Postup v souladu se Stripe docs (lookup_keys[] array, měna filtrována až z výsledku). Manuální test ✅ (CZK checkout prošel, návrat `?success=true`). Pozn.: před testem bylo třeba vymazat zastaralý `stripe_customer_id` v DB (customer neexistoval v aktuálním Stripe účtu).
- **Upravené soubory**: billing-card.tsx, checkout/route.ts, ukol.md, CHANGELOG.md.

- **Kontext**: `CurrencySwitcher` existoval, ale v `billing-client.tsx` i `pricing-client.tsx` byl default natvrdo `"eur"` → český uživatel viděl EUR místo CZK.
- **Změna**: `src/lib/pricing.ts` – NOVÝ helper `getDefaultCurrency(locale)` (`cs`→`czk`, jinak→`eur`). Obě client komponenty volají `useState(getDefaultCurrency(locale))` místo `"eur"`.
- **Poznámka**: Krok 2 (typografie) z většiny hotov (serif na Landing, sans v app, Pravidlo 8 splněno). Free label zůstává hardcodovaný `"Free"` → řeší Krok 5 (lokalizace).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Manuální test ✅ (cs→CZK, en/uk→EUR, přepínání částek OK).
- **Upravené soubory**: pricing.ts, billing-client.tsx, pricing-client.tsx, ukol.md, CHANGELOG.md.

### 🔧 Fix - Instagram připojení má vlastní selektor (neotvírá FB Page modál)

- **Kontext**: Klik na tlačítko Instagram otevíral stejný modál jako Facebook (výběr FB stránek) a nenacházel IG účet. Příčina: IG flow volal `signInWithOAuth(provider:"facebook")` a callback ukládal IG přes `/me/accounts` (FB stránky) jako `is_active:true` + signál `?fb=connected` → otevřel FB selektor. IG účet uživatele (propojený s FB, ale ne přes Page) se nenašel.
- **Změna**:
  - `callback/route.ts` – Instagram větev (`requestedPlatform==="instagram"`) nyní ukládá nalezené IG účty (z `/me`, `/me/instagram_business_account` i z FB stránek) jako **`is_active:false`** do `social_accounts` a na konec přidává signál **`?ig=connected`** (místo `?fb=connected`). Zrušena auto-aktivace IG během OAuth (žere slot Free plánu).
  - `accounts/page.tsx` – přidán načítací efekt `fetchPendingIgAccounts` (GET `/api/accounts/instagram/select`), signál `?ig=connected` otevírá nový `InstagramAccountSelector`, sekce "Nalezené Instagram účty" s avatary. IG scopes rozšířeny o `pages_show_list,pages_read_engagement,pages_manage_posts` (aby se našly i IG přes FB stránku).
  - NOVÁ `src/app/api/accounts/instagram/select/route.ts` – vrací neaktivní IG účty (jako `facebook/select`).
  - NOVÁ `src/components/instagram-account-selector.tsx` – glassmorphism dialog "Zaškrtněte IG účty" (kopie FB Page selectoru, růžová varianta), tlačítko "Připojit" volá `toggleAccountActive(id,true)`.
  - i18n: přidány klíče `pendingIgTitle/Subtitle/manageIgButton/noIgFound/igSelector*` do cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0).
- **Upravené soubory**: callback/route.ts, accounts/page.tsx, instagram/select/route.ts (nová), instagram-account-selector.tsx (nová), cs.json, en.json, uk.json, CHANGELOG.md.

### 🔧 Fix - Smyčka v modálu Facebook stránek (auto-aktivace Instagramu blokovala výběr Page)

- **Kontext**: Po přechodu na produkční doménu se při propojení Facebooku otevřel modál výběru stránek (Pages), ale po kliknutí na "Uložit"/aktivaci se modál znovu objevil a FB účet se nepřidal. Podezření na NULL `account_id` bylo mylné (sloupec `account_id` existuje jen v `post_platforms`, ne v `social_accounts`).
- **Root cause**: V `src/app/auth/callback/route.ts` se při Facebook flow pro každou stránku s propojeným IG business accountem **automaticky ukládal Instagram s `is_active: true`**. Na Free plánu (limit = 1) to sežralo jediný slot ještě během OAuth, takže následná aktivace FB stránky v modálu selhala na limitu (`toggleAccountActive` → `accountLimitErrorMessage`), selector udělal optimistic revert a stránka se vrátila → vypadalo to jako smyčka. Navíc callback na začátku deaktivuje všechny FB řádky, proto "zmizely" staré účty.
- **Změna**: `src/app/auth/callback/route.ts` (blok IG nalezeného přes FB stránku, ~ř. 728) – `is_active: true` → `is_active: false` (uložen neaktivní, stejně jako Pages). Instagram se připojuje zvlášť přes IG tlačítko (samostatný Direct Login branch, `is_active: true`). Samostatný Instagram Direct Login branch (ř. 607) a YouTube zůstávají `is_active: true`.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Konzistence: `facebook/select` filtruje jen `platform='facebook'`, takže neaktivní IG se neobjeví v pending seznamu (žádoucí).
- **Upravené soubory**: callback/route.ts, CHANGELOG.md.

### 🔧 Fix - Instagram se nepřipojoval samostatně (platform hint v top-level query param)

- **Kontext**: Po kliku na tlačítko Instagram se otevřel Facebook OAuth, ale po odkliknutí se IG nepřidal (znovu se nabídl Facebook). Ostatní platformy (FB, YouTube, LinkedIn, X, TikTok) fungovaly.
- **Root cause**: IG handler v `accounts/page.tsx:893` posílá `platform=instagram` jako **top-level** query param (`.../auth/callback?next=...&platform=instagram`), ale `auth/callback/route.ts` hledal `platform` **uvnitř** `next` parametru (tj. `/cs/accounts?platform=instagram`). `next` je ale pouhá lokální cesta bez query, takže `requestedPlatform` byl vždy `null` → IG Direct Login branch (route.ts ~ř. 546) se nikdy nespustil → IG se neuložil. Facebook branch ("Always fetch Facebook Pages") běží vždy bez tohoto flagu, proto fungoval.
- **Změna**: `src/app/auth/callback/route.ts` – detekce `platform` teď čte `requestUrl.searchParams.get("platform")` z top-level URL (zpětně kompatibilní s legacy formou uvnitř `next`).
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). `normalizeNext` nemění `next` (lokální cesta), takže top-level `platform` přežije.
- **Upravené soubory**: callback/route.ts, CHANGELOG.md.







