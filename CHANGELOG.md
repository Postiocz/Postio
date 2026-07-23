# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🚀 Prompt 039 – KROK 2: Spodní admin navigace (Mobil) ✅

- **Kontext**: Admin sekce na mobilu neměla vlastní spodní navigaci. Zobrazovala by se hlavní app navigace, která do adminu nepatří.
- **Změny**:
  - **i18n**: Přidány klíče `nav.adminDashboard`, `nav.adminUsers`, `nav.adminBilling` do `cs.json`, `en.json`, `uk.json`.
  - **`admin-mobile-nav.tsx`** (nová): Fixed bottom bar pro admin sekci na mobilech se 3 položkami — Dashboard (`LayoutDashboard`), Uživatelé (`Users`), Fakturace (`CreditCard`). Glassmorphism `bg-[#09090b]/90`, indigo active glow, framer-motion animace.
  - **Admin layout**: Přidán `<AdminMobileNav locale={locale} />` — zobrazí se pouze v admin route group, hlavní app mobile nav se v adminu neukazuje.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (mobilní admin navigace funguje, 3 položky, aktivní stav).
- **Upravené soubory**: `admin-mobile-nav.tsx` (nová), `(admin)/layout.tsx`, `cs.json`, `en.json`, `uk.json`, `ukol.md`, `CHANGELOG.md`.

### 🚀 Prompt 039 – KROK 1: Admin odkaz v Sidebaru a mobilní navigaci ✅

- **Kontext**: Admin panel neměl viditelný vstup z hlavní aplikace. Oprávnění admini neměli možnost se dostat do admin sekce přes UI.
- **Změny**:
  - **i18n**: Přidán klíč `nav.adminPanel` do `cs.json`, `en.json`, `uk.json`.
  - **Sidebar (`sidebar.tsx`)**: Nové props `isAdmin` a `adminLabel`. Pod hlavní navigací se adminům zobrazí odkaz "Admin Panel" s ikonou `ShieldCheck`, aktivní stav s indigo glowem.
  - **MobileNav (`mobile-nav.tsx`)**: Nové props `isAdmin` a `adminLabel`. V settings dropdown menu přibyla položka "Admin Panel" pro administrátory.
  - **Dashboard layout**: Fetch `role` z `public.users` (rozšířen SELECT o `role`). Předáno `isAdmin={userRole === "admin"}` do Sidebaru i MobileNavWrapperu.
- **Ověření**: `npx tsc --noEmit` ✅. Manuální test ✅ (admin vidí odkaz, běžný uživatel ne).
- **Upravené soubory**: `sidebar.tsx`, `mobile-nav.tsx`, `mobile-nav-wrapper.tsx`, `(dashboard)/layout.tsx`, `cs.json`, `en.json`, `uk.json`, `ukol.md`, `CHANGELOG.md`.

### 🚀 Prompt 038 – KROK 2: Detail uživatele + navigace ✅

- **Kontext**: Admin panel potřeboval stránku detailu uživatele a opravu navigace mezi tabulkou a detailem.
- **Změny**:
  - **Stránka `/admin/users/[id]`**: Profilová karta (avatar, jméno, email, role, tarif, registrace, streak), tabulka propojených sociálních účtů (platforma, jméno, stav), historie příspěvků (náhled textu, datum, status badge).
  - **Server action**: `getUserById()` (včetně emailu z `auth.users`), `getUserAccounts()`, `getUserPosts()`, `updateUserRole()` s audit_log záznamem.
  - **Navigace**: Opraven Link v tabulce uživatelů — přidán `locale` prefix (`/${locale}/admin/users/${id}`).
  - **Admin UI**: Tlačítko pro změnu role (User ↔ Admin) s okamžitým přepisem do DB a audit_log.
- **Ověření**: `npx tsc --noEmit` ✅. `npx next build` ✅ (routes `/[locale]/admin/users/[id]`).
- **Upravené soubory**: `admin/users/[id]/page.tsx` (nová), `admin/users/page.tsx` (link opraven), `modules/admin-core/actions.ts` (nové akce), `ukol.md`, `CHANGELOG.md`.

### 🚀 Prompt 038 – KROK 1: Modularizace Admin Core ✅

- **Kontext**: Admin kód byl rozprostřelen mezi `src/app/[locale]/(admin)/admin/` a `src/components/admin/`. Potřebujeme centralizovaný modul a čistý routing.
- **Změny**:
  - **Přesun do `src/modules/admin-core/`**: `actions.ts` (getAllUsers, getGlobalStats), `admin-config.ts` (appName, barvy, cesty), `index.ts` (exporty), `components/` (admin-sidebar, admin-header, metric-card).
  - **Routing fix**: `/cs/admin` → dashboard, `/cs/admin/users` → tabulka. Odstraněny provizorní redirect page.tsx.
  - **Admin config**: Nový `admin-config.ts` s centralem nastavením (Pure Black #000, 20px radius, indigo #6366F1).
- **Ověření**: `npx tsc --noEmit` ✅. `npx next build` ✅ (routes `/[locale]/admin`, `/[locale]/admin/users`).
- **Upravené soubory**: `modules/admin-core/*` (nové), `app/[locale]/(admin)/admin/page.tsx` (nová), `app/[locale]/(admin)/admin/users/page.tsx` (nová), `layout.tsx` (importy upraveny), `ukol.md`, `CHANGELOG.md`.

### 🚀 Prompt 037 – KROK 5: Globální správa uživateli ✅

- **Kontext**: Admin musí vidět a spravovat data VŠECH uživatelů, nikoliv jen své.
- **Změny**:
  - **Server action** (`admin/actions.ts`): `getAllUsers()` a `getGlobalStats()` používají `createAdminClient` (service_role) pro obcházení RLS. `getGlobalStats` vrací globální COUNT uživatelů, příspěvků a placenců.
  - **Stránka `/admin/users`**: Kompletní tabulka všech uživatelů s sloupci: jméno, ID, tarif (badge), datum registrace, streak, role (badge). Glassmorphism `bg-[#09090b]/80`, `rounded-[20px]`.
  - **Dashboard**: Převeden na globální statistiky přes `getGlobalStats()` místo lokálního `createClient`.
  - **Bezpečnost**: Admin layout stále používá `checkAdminAccess()` guard — pouze admini mohou vstoupit.
- **Ověření**: `npx tsc --noEmit` ✅. `npx next build` ✅ (routes `/[locale]/admin/dashboard`, `/[locale]/admin/users`).
- **Upravené soubory**: `admin/actions.ts` (nová), `admin/dashboard/page.tsx` (upraven), `admin/users/page.tsx` (nová), `ukol.md`, `CHANGELOG.md`.

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
