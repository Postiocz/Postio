## 2026-05-09

### Fix – Supabase middleware session refresh pro ECC (P-256) JWT klíče (DOKONČENO)

- Supabase v projektu používá nové **asymetrické** podpisové klíče **ECC (P‑256)** pro JWT (nový bezpečnostní standard; klíče v env mají prefix `sb_`).
- V Next.js middleware (Edge runtime) je nutné aktivně vynutit server-side validaci session, jinak může docházet k náhodným logoutům kvůli neproběhlému refreshi JWT cookie s novými ECC klíči.
- `src/lib/supabase/middleware.ts` – upraven `cookies.setAll` na oficiální `@supabase/ssr` middleware pattern:
  - nastavuje cookies do `request` i `response`
  - po setnutí cookies re-generuje `NextResponse.next({ request: { headers } })` aby Edge runtime viděl aktuální session
- `middleware.ts` – explicitní `await supabase.auth.getUser()` probíhá před redirect logikou; response se bere až po případném refreshi cookie

## 2026-05-07

### Fix – Hydration mismatch v MobileNav + Dark mode flash při navigaci (DOKONČENO)

**Problém 1 – Hydration failed (MobileNav):**
- Server renderoval RSC placeholder pro `MobileNav`, klient renderoval `<nav>` element
- Next.js hlásil hydration mismatch: `<nav>` (client) vs `<div>` (server)
- Příčina: `MobileNav` (use client) byl přímo v `DashboardLayout` (Server Component) – při SSR se neshodovalo HTML

**Oprava 1 – Client-side only rendering MobileNav:**
- `mobile-nav-wrapper.tsx` – nový client wrapper: `useState(false)` + `useEffect(setMounted(true))`
- Renderuje `null` při SSR (mounted=false), `<MobileNav>` až po client mountu
- `layout.tsx` – swap `MobileNav` → `MobileNavWrapper`
- Žádný hydration mismatch – server i klient vidí `null` při hydrataci

**Problém 2 – Dark mode bliká light mode při přechodu mezi stránkami:**
- Při navigaci se `DashboardLayout` re-renderuje a `ThemeProvider` se re-initializuje
- Na krátký moment není na `<html>` class `dark` → problikne light pozadí
- Root layout `serverThemeClass` řešil pouze `theme=dark`, ne `theme=system`

**Oprava 2 – Anti-flash theme script:**
- `src/app/layout.tsx` (root) – inline `<script>` v `<head>`:
  - Čte `theme` cookie ještě před React hydration
  - Pokud `system` → detekuje `prefers-color-scheme: dark` media query
  - Okamžitě nastaví `dark` class na `<html>` – zero flash
- `serverThemeClass` → `isDark` – default `system` = dark (většina uživatelů má dark)
- `theme-provider.tsx` – přidaný `mounted` state guard proti dvojitému aplikování theme

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Filtry na stránce Příspěvky + SetupGuide modal persistence (DOKONČENO)

**Problém 1 – Filtry na stránce "Příspěvky" nefungovaly:**
- Klik na filtr (např. YouTube) změnil URL query params přes `<Link>` ale data se neaktualizovala bez manuálního obnovení stránky
- Příčina: `_posts-filters.tsx` používal `<Link>` elementy pro navigaci, `page.tsx` (Server Component) filtroval data na serveru podle searchParams, ale `PostsList` (client component) měl vlastní `useState(initialPosts)` který se při client-side navigaci nepřerenderoval
- Kalendář fungoval správně protože používal `<button>` + lokální state + `useMemo` pro client-side filtrování

**Oprava 1 – Client-side filtrování jako v Kalendáři:**
- `_posts-filters.tsx` – kompletní přepsání: `<Link>` → `<button>` s `onClick` handlerem, nový `onFilterChange` callback props, odstraněn `locale` prop a `buildHref` funkce
- `_post-card.tsx` – `PostsList` zjednodušen: odstraněn interní state pro posts (pouze renderuje co dostane), nový `onDeleted` callback props, export `PostListItem` typ
- `_posts-container.tsx` – **nový** client wrapper component:
  - Drží shared state filtrů (`activePlatform`, `activeStatus`)
  - `useMemo` pro client-side filtrování posts podle platformy i statusu
  - Kombinuje header + filtry + posts list + empty states
  - Manage delete operace + refresh po smazání posledního postu
- `page.tsx` – zjednodušena: fetchuje všechny posts bez server-side filtrů, předává do `PostsContainer`
- Odstraněny nepoužité importy (`Button`, `Plus`, `FileText`, `Link`, `PostsList`, `PostsFilters`)

**Problém 2 – SetupGuide modál "Dokončete nastavení" se vrátil po refreshi:**
- Uživatel zavřel modál tlačítkem X → `dismissed` state = `true` → modál zmizel
- Po obnovení stránky se state resetoval na `false` → modál se znovu zobrazil
- Příčina: `dismissed` stav byl pouze v React state, žádná persistencia

**Oprava 2 – localStorage persistence:**
- `setup-guide.tsx` – `dismissed` state se inicializuje z `localStorage` (lazy initializer)
- `handleDismiss` callback – nastaví state i `localStorage.setItem("setup-dismissed", "true")`
- Import `useCallback` pro optimalizaci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Supabase "Lock stolen" runtime error (DOKONČENO)

**Problém:** `Lock "lock:sb-...-auth-token" was released because another request stole it` – runtime error v `edit-post-dialog.tsx`. Příčina: každý `EditPostDialog` (jeden na každý post card) volal `createClient()` při každém renderu, což vytvořilo nové instance Supabase browser klienta. Když stránka měla 30+ postů, 30 instancí volalo `getUser()` současně v useEffect a Supabase interní mutex pro cookie parsing se mezi sebou "kradl".

**Oprava:**
- `edit-post-dialog.tsx` – Supabase klient se nyní cachuje v `useRef` (singleton pattern). `getUser()` se volá pouze když je dialog otevřený (`open` prop) a `userId` ještě není nastavená. Přidán try/catch guard.
- `profile-form.tsx` – totéž `useRef` cachování klienta pro konzistenci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Null-safe výpočty v analytics dashboardu (DOKONČENO)

**Problém:** Když migrace 010 nebyla aplikována v Supabase (sloupce `likes`, `comments`, `shares`, `clicks`, `saves` neexistují), vracely se tyto hodnoty jako `null`. V `analytics-dashboard.tsx` se sčítaly přímo (`existing.likes + a.likes`), což při `null` vracelo `NaN` a rozbíjelo grafy i metrické karty.

**Oprava:**
- `dailyData` useMemo – všechny aritmetické operace nyní s `?? 0` fallback: `(existing.likes ?? 0) + (a.likes ?? 0)`
- `postsWithAnalytics` useMemo – totéž
- `dailyData` output – `likes`, `comments`, `shares` mapují na `?? 0` pro BarChart data
- `totals` useMemo už měl `?? 0` guard – OK
- Typ `AnalyticsRecord` má detailní sloupce jako `number | null` – správně

**Poznámka:** SQL migrace 010 zatím nebyla aplikována do Supabase. Fallback v `actions.ts` vkládá pouze `impressions + engagements` pokud detailní sloupce chybí. Dashboard nyní správně handle null hodnoty.

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – Analytika Dashboard s Recharts (DOKONČENO)

**Cíl:** Implementace kompletního Analytics dashboardu s grafy, metriky a filtry časového období.

**Nové soubory:**
- `src/app/[locale]/(dashboard)/analytics/analytics-dashboard.tsx` – Client Component s Recharts grafy:
  - **8 metrických karet**: Dosah (Reach), Interakce, ER%, Lajky, Komentáře, Sdílení, Kliknutí, Uloženo
  - **Area Chart** – Výkon v čase: Zobrazení, Interakce, Lajky (indigo/purple/rose gradienty)
  - **Bar Chart** – Lajky, Komentáře, Sdílení (rose/amber/cyan gradienty)
  - **Top Posts** – Seznam nejlepších příspěvků s detailními metrikami
  - **Filtr období** – 7 dní, 30 dní, 3 měsíce (pill toggle buttons)
  - **Design**: Glassmorphism karty (20px radius), barevné ikony s gradienty, glow efekty
  - **Empty states** – Purple glow + BarChart3 ikona + i18n texty
- `src/app/[locale]/(dashboard)/analytics/actions.ts` – Server Actions:
  - `generateDemoAnalytics()` – vygeneruje 30 realistických demo posts + analytics záznamů
  - Metriky: impressions (500–5500), engagements (2–10% z impressions), likes/comments/shares/clicks/saves
  - Platformy: instagram, facebook, twitter,.linkedin (random distribuce)
  - Data rozložena do posledních 90 dní
- `supabase/migrations/010_extend_analytics_table.sql` – DB migrace:
  - Nové sloupce v `analytics`: `likes`, `comments`, `shares`, `clicks`, `saves` (INT, DEFAULT 0)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – kompletně přepsaný Server Component:
  - Fetchuje posts + analytics z Supabase pro aktuálního uživatele
  - Auto-generuje demo data pokud jsou obě tabulky prázdné
  - Předává data do `AnalyticsDashboard` client componentu
- `src/lib/supabase/types.ts` – rozšířený typ `analytics` o nové sloupce (Row/Insert/Update)
- `src/messages/cs.json` – rozšířený namespace `analytics` (14 nových klíčů):
  - `subtitle`, `reach`, `engagementRate`, `noDataSubtitle`
  - `last7Days`, `last30Days`, `last3Months`
  - `overview`, `performanceOverTime`, `postsPerformance`
  - `averageReach`, `totalLikes`, `totalComments`, `totalShares`, `clicks`, `saves`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině

**Dependency:**
- `npm install recharts` – knihovna pro interaktivní grafy (AreaChart, BarChart, Tooltip, Legend)

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Demo posts insert UUID error (DOKONČENO)

**Problém:** `generateDemoAnalytics()` v `actions.ts` posílal manuálně generované string ID (`demo-post-${user.id}-${i}`) do `posts` tabulky, která očekává UUID. Supabase vrátil error `42804: invalid input syntax for type uuid`.

**Řešení:**
- Odstraněno ruční `id` z `demoPosts` – DB generuje UUID přes `uuid_generate_v4()`
- Po insertu posts: `.select("id")` vrací skutečná UUID z DB
- Analytics insert nyní používá skutečná `post_id` UUID z `insertedPostIds[]`
- Odstraněno `.single()` – vrací všechny řádky z batch insertu

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – 2FA Login Flow (DOKONČENO)

**Fix – `useActionState` outside of transition error:**
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – odstraněn manuální `handleSubmit` + `isVerifying` state
- `<form action={formAction}>` – formAction se předává přímo jako `action` prop → Next.js automaticky obalí volání do `startTransition`
- `isPending` z `useActionState` stačí pro loading state, ruční `isVerifying` není potřeba

**Fix – `NEXT_REDIRECT` swallowed by catch block:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – `catch (e)` chytal `NEXT_REDIRECT` error z `redirect()` a vracel `{ error: "internal_error" }` místo redirectu
- Nyní: `if (e instanceof Error && e.message === "NEXT_REDIRECT") { throw e; }` – redirect errors projdou nahoru
- **Fix – `otplib.verify()` return value:** – otplib vrací `{ valid: true, delta: 0 }` místo booleanu → `typeof result === "boolean" ? result : result.valid`

**Cíl:** Po přihlášení uživatele s aktivní 2FA přesměrovat na verifikační stránku `/login/verify-2fa` místo dashboardu.

**Nové soubory:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – Server Actions pro ověření 2FA kódu při přihlášení:
  - `verify2FACode()` – ověří TOTP kód proti `two_factor_secret` z DB nebo recovery kód proti `two_factor_recovery_codes`
  - `signOutFrom2FA()` – odhlášení z verifikační stránky
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – Client Component formulář:
  - 6místný TOTP kód (výchozí) / 8místný recovery kód (přepínač)
  - Visual display prázdných boxů pro jednotlivé číslice
  - Error messages + loading state
- `src/app/[locale]/(auth)/login/verify-2fa/page.tsx` – Server Component stránka:
  - Logo + glassmorphism card layout
  - LocaleSwitcher + link zpět na login

**Opravené soubory:**
- `src/components/auth/email-signin.tsx` – po úspěšném `signInWithPassword`:
  - Dotaz na `users.two_factor_enabled` pro přihlášeného uživatele
  - Redirect na `/[locale]/login/verify-2fa` pokud je 2FA enabled
  - Redirect na `/[locale]` (dashboard) jinak
- `src/app/auth/callback/route.ts` – po úspěšném `exchangeCodeForSession` (Google OAuth):
  - Stejná kontrola `two_factor_enabled`
  - Redirect na `verify-2fa` nebo dashboard
- `middleware.ts` – přidán `/verify-2fa` do `publicPatterns` aby byla route přístupná bez auth redirectu
- `src/messages/cs.json`, `en.json`, `uk.json` – 15 nových klíčů v namespace `auth`:
  - `verify2FATitle`, `verify2FASubtitle`, `verify2FAPlaceholder`, `verify2FASubmit`, `verify2FAVerifying`
  - `verify2FAError`, `verify2FARetry`, `verify2FABackToLogin`
  - `verify2FAUseRecoveryCode`, `verify2FARecoveryCodeTitle`, `verify2FARecoveryCodeDesc`
  - `verify2FARecoveryCodePlaceholder`, `verify2FARecoveryCodeSubmit`, `verify2FARecoveryCodeError`, `verify2FASwitchToTOTP`

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Chybějící překlad `settings.loading` (DOKONČENO)

**Problém:** `MISSING_MESSAGE: Could not resolve 'settings.loading' in messages for locale 'cs'` – tlačítko v `Setup2FADialog` volalo `t("loading")` s namespace `"settings"`, ale klíč `loading` existoval pouze v sekci `common`.

**Řešení:** Přidán klíč `loading` do sekce `settings` ve všech třech jazycích:
- `src/messages/cs.json` – `"loading": "Načítání..."`
- `src/messages/en.json` – `"loading": "Loading..."`
- `src/messages/uk.json` – `"loading": "Завантаження..."`

### Fix – Bezpečný 2FA Verification Flow (DOKONČENO)

**Problém:** 2FA se zapnula okamžitě po kliknutí na tlačítko bez ověření TOTP kódu. Uživatel jen zadával libovolný text a ten se ukládal jako "secret". Žádný QR kód, žádné ověření proti Google Authenticator.

**Řešení:** Implementován bezpečný 3fázový proces aktivace 2FA:

1. **Inicializace (Pending)**: Klik na "Zapnout 2FA" otevře modální dialog → Server Action `generate2FASetup()` vygeneruje `two_factor_secret` (otplib) + QR kód (qrcode library) → QR se zobrazí uživateli
2. **Ověření (Handshake)**: Uživatel naskenuje QR kód v Google Authenticator, zadá 6místný TOTP kód do modálu → klikne "Potvrdit a aktivovat"
3. **Finální aktivace**: Server Action `confirm2FASetup()` ověří TOTP kód proti secretu → pokud je správný: `two_factor_enabled = true`, uloží secret, vygeneruje 8 záchranných kódů → zobrazí recovery codes screen

**Nové soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/setup-2fa-dialog.tsx` – Client Component modální dialog pro nastavení 2FA:
  - **Step 1 (Setup)**: QR kód + tajný kód + vstupní pole pro 6místný TOTP kód
  - **Step 2 (Recovery)**: Seznam 8 záchranných kódů + tlačítko kopírovat + potvrzení uložení
  - Design: Glassmorphism, 20px radius, barevné ikony (indigo/purple/amber)
  - Veškeré texty v češtině/angličtině/ukrajinštině (i18n)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts`:
  - Odstraněn `enable2FA` (starý nebezpečný action)
  - Nový `generate2FASetup()` – generuje secret + QR code data URL
  - Nový `confirm2FASetup(formData)` – ověřuje TOTP kód, generuje recovery codes, ukládá do DB
  - Importy: `otplib` (generateSecret, generateURI, verify) + `qrcode` (toDataURL)
  - `disable2FA` zůstává beze změny
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx`:
  - Odstraněn starý formulář s `verification_code` inputem
  - Nové tlačítko "Zapnout 2FA" → otevře `Setup2FADialog`
  - Nový state `show2FADialog` + handler `handle2FASuccess()`
  - Odstraněn `enable2FAAction` + `handleEnable2FA`
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx`:
  - Přidán `twoFASuccess` label do props
- `src/messages/cs.json` – 18 nových klíčů: `setup2FATitle`, `setup2FAStep1-3`, `verificationCodeLabel`, `verificationCodePlaceholder`, `confirmAndEnable`, `secretCode`, `qrCodeInstructions`, `invalidCode`, `recoveryCodesTitle`, `recoveryCodesDescription`, `recoveryCodesWarning`, `copyRecoveryCodes`, `recoveryCodesCopied`, `iHaveSavedCodes`, `done`, `cancelSetup`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `package.json` – `@types/qrcode` přidán do devDependencies

**Dependency:**
- `npm install -D @types/qrcode` – TypeScript definice pro `qrcode` library

**Build:** `npm run build` – úspěšně, TypeScript OK, žádné diagnostics chyby

### Fix – Sloupec `avif_auto_download` v migraci 009 (DOKONČENO)
- `supabase/migrations/009_create_avatars_bucket.sql` – odstraněn sloupec `avif_auto_download` z INSERT statementu:
  - Free tier Supabase tento sloupec nemá → error `42703: column does not exist`
  - AVIF konverze není pro avatar bucket potřeba – stačí `id`, `name`, `public`

### Krok 74 – Supabase Storage Bucket pro Avatary (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/009_create_avatars_bucket.sql` – vytvoření storage bucketu `avatars`:
  - Public bucket pro profilové obrázky
  - RLS politiky:
    - Users can upload avatars (INSERT do vlastního folderu `user_id/`)
    - Anyone can view avatars (SELECT pro všechny)
    - Users can update their own avatars (UPDATE vlastních souborů)
    - Users can delete their own avatars (DELETE vlastních souborů)

### Krok 73 – Kompletní implementace Nastavení podle Buffer UX (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/008_add_profile_settings.sql` – nové sloupce v tabulce `users`:
  - `organization_name` TEXT – název organizace
  - `backup_email` TEXT – záložní email
  - `avatar_url` TEXT – URL profilového obrázku
  - `two_factor_enabled` BOOLEAN DEFAULT FALSE – stav 2FA
  - `two_factor_secret` TEXT – TOTP secret
  - `two_factor_recovery_codes` JSONB – recovery kódy

**Stránka Profil (`/settings/profile`):**
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – kompletně přepsaný Client Component:
  - **Foto profilu**: Upload do Supabase Storage (`avatars` bucket), preview, spinner při nahrávání
  - **Email**: Read-only s badge verifikace (již existovalo)
  - **Jméno**: Input pro jméno/příjmení s Save tlačítkem (již existovalo)
  - **Backup Email**: Nové pole pro záložní email s popisem
  - **Heslo**: Sekce pro změnu hesla s toggle form, show/hide password, validace (min 6 znaků)
  - **2FA**: Toggle pro dvoufázové ověřování, enable/disable formuláře, badge stavu
  - **Jazyk**: Selector + přepnutí locale (již existovalo)
  - **Danger Zone**: Smazání účtu s potvrzením ("DELETE"), červená karta
  - **Design**: Glassmorphism karty (20px radius), Buffer-style layout
  - **Toast feedback**: Green check po úspěšném uložení každé sekce
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – rozšířené Server Actions:
  - `updateFullName`, `updateLanguage` (již existovaly)
  - `updateBackupEmail` – update backup_email
  - `updatePassword` – Supabase auth.updateUser
  - `enable2FA`, `disable2FA` – toggle 2FA + secret
  - `deleteAccount` – smazání z users + signOut
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – update Server Component:
  - Fetchuje nová pole: `avatar_url`, `backup_email`, `two_factor_enabled`
  - Předává všechny labely z i18n

**Stránka Organizace/Obecné (`/settings/general`):**
- `src/app/[locale]/(dashboard)/settings/general/page.tsx` – Server Component:
  - **Creation Date**: Read-only datum vytvoření účtu (formátováno podle locale)
  - **Organization Name**: Input s Save tlačítkem
  - Fetchuje `organization_name`, `created_at` z DB
- `src/app/[locale]/(dashboard)/settings/general/general-form.tsx` – Client Component:
  - Dvě sekce v Buffer stylu (Creation Date, Organization Name)
  - State management pro organization name + save feedback
- `src/app/[locale]/(dashboard)/settings/general/actions.ts` – Server Action:
  - `updateOrganizationName` – update organization_name v DB

**i18n aktualizace:**
- `src/messages/cs.json` – nové klíče v `settings` namespace (38 nových klíčů):
  - `generalDescription`, `creationDate`, `organizationName`, `organizationNamePlaceholder`
  - `photo`, `uploadPhoto`, `photoDescription`, `uploading`
  - `backupEmail`, `backupEmailPlaceholder`, `backupEmailDescription`
  - `password`, `changePassword`, `newPassword`, `confirmPassword`
  - `twoFactorAuth`, `twoFactorAuthDescription`, `twoFactorEnabled`, `twoFactorDisabled`
  - `enable2FA`, `disable2FA`, `dangerZone`, `dangerZoneDesc`
  - `deleteAccount`, `confirmPasswordDelete`, `deleteAccountConfirm`, `deletingAccount`
  - `savedGeneral`, `errorSavingGeneral`, `savedBackupEmail`, `errorSavingBackupEmail`
  - `savedPassword`, `errorChangingPassword`, `twoFASuccess`, `twoFADisabled`
  - `errorEnabling2FA`, `errorDisabling2FA`, `photoUpdated`, `errorUploadingPhoto`
  - `accountDeleted`, `errorDeletingAccount`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `src/messages/*.json` – `common.verificationCode` přidán do všech jazyků

### Fix – Whitespace v modálu "Vytvořit nový štítek" (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – vylepšení spacingu pro vzdušnost:
  - **DialogContent**: `p-6 sm:p-8` (menší padding na mobilu)
  - **DialogTitle**: `text-lg sm:text-xl` (responzivní velikost)
  - **DialogHeader**: `pb-3 sm:pb-4`
  - **Formulář**: `space-y-8 sm:space-y-10 pt-4 sm:pt-6` (responzivní mezery mezi sekcemi)
  - **Kořen problému**: `space-y-3` na wrapper `<div>` nefungoval správně – Radix Label má `leading-none` + inline display, což rozbíjelo margin kasládování. Řešení:
    - Odstraněno `space-y-3` z obou wrapper divů
    - Label: `block` display (překoná inline default z Radix)
    - Input: explicitní `mt-3` (12px margin-top přímo na inputu – spolehlivé)
    - Barvy: `mt-3` na kontejner koleček (stejný odstup jako u inputu – label "Barva štítku" na stejné výšce jako "Název štítku")
  - **Mobilní responzivita**: Všechny paddingy a spacingy mají `sm:` varianty

### Krok 72 – Nová stránka Štítky (Tags) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/page.tsx` – Server Component stránka Štítky:
  - **Design**: 100% konzistentní s ostatními stránkami (templates pattern) – H1 + count + tlačítko Create
  - **Empty State**: Centrální obsah s fialovým glow (blur-3xl), Tag ikona (h-16 w-16), nadpis, podnadpis, popis + CTA tlačítko
  - **Seznam štítků**: Karty s barevným tečkovým indikátorem + název + hover delete button (opacity transition)
  - **Data**: Fetchuje `tags` z DB, ordered by `created_at DESC`
  - **Responzivita**: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`, centrální empty state
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – Client Component modální dialog:
  - **Formulář**: Input pro název štítku + výběr barvy (10 barevných koleček)
  - **Barvy**: Indigo, Purple, Pink, Red, Orange, Amber, Emerald, Teal, Cyan, Blue
  - **Výběr barvy**: Rounded-full buttons s ring indikátorem + check ikona na vybranou barvu
  - **Validace**: Submit disabled pokud je prázdný název nebo běží create
  - **Dialog**: shadcn/ui Dialog s glassmorphism stylem (rounded-[20px], backdrop-blur-xl)
- `src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx` – Client Component karta štítku:
  - **Vizuál**: Barevná tečka + název + delete button (opacity-0 → group-hover:opacity-100)
  - **Delete**: Confirm dialog před smazáním → Server Action `deleteTag`
- `src/app/[locale]/(dashboard)/settings/labels/actions.ts` – Server Actions:
  - `createTag(name, color)`: INSERT do `tags` tabulky s `user_id`, revalidace `/settings`
  - `deleteTag(id)`: DELETE z `tags` tabulky s RLS kontrolou `user_id`, revalidace `/settings`
- `supabase/migrations/007_create_tags_table.sql` – SQL migrace:
  - `CREATE TABLE tags` (id UUID, user_id UUID FK → users, name TEXT, color TEXT, created_at, updated_at)
  - `INDEX idx_tags_user_id` pro rychlé dotazy
  - RLS politiky: SELECT/INSERT/UPDATE/DELETE pouze pro vlastníka (`auth.uid() = user_id`)
- `src/messages/cs.json` – nový namespace `tags` (22 klíčů):
  - title, emptyTitle, emptySubtitle, emptyDescription, createTag, modalTitle
  - nameLabel, namePlaceholder, colorLabel, cancel, create
  - tagCreated, tagDeleted, errorCreating, errorDeleting, deleteConfirm, deleteTag
  - usedInPosts, usedInPostsZero
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/labels` již existuje v sidebar dropdown menu (Tag ikona, sekce "Funkce")
- **Build**: `npm run build` – úspěšně, TypeScript OK, nová route `/[locale]/settings/labels` registrována

### Krok 71 – Nová stránka Nastavení / Předvolby (Settings/Preferences) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/preferences/page.tsx` – Server Component stránka Předvolby:
  - **Design**: Stejný styl jako Profil/Fakturace – hlavička H1 + popis, responzivní font (`text-xl sm:text-2xl md:text-3xl`)
  - **Data**: Fetchuje `timezone`, `time_format`, `start_of_week`, `default_posting_time` z tabulky `users`
  - **Default values**: Europe/Prague, 24h, monday, 09:00 (pokud DB vrací null)
  - **Labels**: Předává přeložené stringy z i18n do Client Componentu (pattern jako ProfileForm)
- `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx` – Client Component formulář:
  - **4 sekce** (vzor Buffer): Timezone, Time Format, Start of Week, Default Posting Action
  - **Timezone**: Select box s 42 časovými pásmi (Evropa, Amerika, Asie, Austrálie, Afrika)
  - **Time Format**: Radio card selection (12h / 24h) s preview času + indigo glow na aktivní volbě
  - **Start of Week**: Select box (Neděle / Pondělí)
  - **Default Posting Action**: Native time picker input
  - **Ikony**: Globe (indigo), Clock (purple), CalendarIcon (emerald), Clock (amber) – barevné ikony v rounded-xl boxech
  - **Ukládání**: Jedno tlačítko Save na konci → Server Action `updatePreferences`
  - **Saved feedback**: Check ikona + "Předvolby uloženy!" (auto-hide po 3s)
  - **Responzivita**: `p-4 sm:p-6`, `text-base sm:text-lg`, selecty `w-full sm:w-80` (fixed šířka na desktopu)
  - **Glassmorphism karty**: `rounded-[20px]`, `bg-white/70 dark:bg-card/40`, `backdrop-blur-md`, border + shadow
- `src/app/[locale]/(dashboard)/settings/preferences/actions.ts` – Server Action:
  - `updatePreferences(formData)`: Update `timezone`, `time_format`, `start_of_week`, `default_posting_time` v `users` tabulce
  - `revalidatePath("/settings")` po úspěchu
- `supabase/migrations/006_add_user_preferences.sql` – SQL migrace:
  - `ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Europe/Prague'`
  - `ADD COLUMN time_format TEXT DEFAULT '24' CHECK (IN '12','24')`
  - `ADD COLUMN start_of_week TEXT DEFAULT 'monday' CHECK (IN 'sunday','monday')`
  - `ADD COLUMN default_posting_time TEXT DEFAULT '09:00'`
- `src/messages/cs.json` – nové i18n klíče (settings namespace):
  - preferencesDescription, timezone, timezoneDescription, timeFormat, timeFormatDescription
  - timeFormat12, timeFormat24, startOfWEEK, startOfWEEKDescription
  - defaultPostingAction, defaultPostingActionDescription, defaultTime
  - savedPreferences, errorSaving, sunday, monday
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/preferences` již existuje v sidebar dropdown menu (SlidersHorizontal ikona)

### Fix – Sidebar Upgrade Button: Odkaz na Billing stránku (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – tlačítko Upgrade v dolní části sidebaru:
  - **Nové**: `asChild` prop na Button + `<Link href={`/${locale}/settings/billing`}>`
  - **Předtím**: Tlačítko bylo jen `<Button>` bez jakékoli funkčnosti
  - **Nyní**: Kliknutí přesměruje na `/settings/billing` (stránka s přehledem plánů)

### Fix – Billing Page: Server → Client Serialization Errors (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – oprava serializace props:
  - **Odstraněno**: `icon` property z plans array (React komponenty nelze serializovat)
  - **Odstraněno**: `t={t as any}` (funkce nelze serializovat z Server do Client Component)
  - **Nové**: `translations` objekt s přeloženými stringy (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Odstraněno**: Importy `Check`, `Crown`, `Sparkles`, `Zap` z lucide-react
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – ikony a překlady na klientské straně:
  - **Nové**: `iconMap` – mapuje `plan.id` → ikonu (`free: Sparkles`, `creator: Zap`, `pro: Crown`)
  - **Nové**: Importy `Crown`, `Sparkles`, `Zap` z lucide-react (v client componentu)
  - **Odstraněno**: `icon: React.ElementType` z Plan interface
  - **Odstraněno**: `locale` a `t: any` z BillingCardProps
  - **Nové**: `translations` interface (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Všechna `t("key")`** → `translations.key` (6 míst)
- **Příčina chyby**: Next.js nedovolí předávat funkce ani React komponenty z Server Component do Client Component – lze pouze plain objekty (stringy, čísla, booly, pole)
- Build: úspěšný, žádné TypeScript chyby

### Krok 70 – Konzistence, Live Data a Fix Mobilního Menu (DOKONČENO)
- `src/components/dashboard/mobile-nav.tsx` – fix barev DropdownMenuContent pro Light/Dark mode:
  - **Light mode**: `bg-white/90`, `text-slate-900`, ikony `text-slate-600`, `border-black/5`
  - **Dark mode**: `bg-black/90`, `text-white`, ikony `text-white/70`, `border-white/10`
  - **Backdrop**: `backdrop-blur-xl` + adaptivní stíny
  - **Nový nav item**: Inbox s ikonou MessageSquare + "NEW" badge (premium variant)
  - **Badge import**: `{ Badge } from "@/components/ui/badge"` pro inline "NEW" na mobilu
- `src/components/ui/badge.tsx` – nová varianta "premium":
  - **Design**: Capsule, glassmorphism, indigo text, jemný border
  - **Styl**: `bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 backdrop-blur-sm shadow-sm`
- `src/app/[locale]/(dashboard)/page.tsx` – živá data z Supabase:
  - **Celkem příspěvků**: `COUNT(*)` z `posts`
  - **Naplánované**: `COUNT(*) WHERE status = 'scheduled'` (reálné číslo místo 0)
  - **Propojené účty**: `COUNT(*)` z `social_accounts` (už fungovalo)
  - **Denní série**: `streak` z `users` tabulky
  - **Flame ikona**: Když `streak > 0`, ikona svítí oranžově (`text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]`)
  - **Consistency Score**: Nová karta s kruhovým progress barem (SVG circle + gradient indigo→purple) – mockup 89%
  - **Icon change**: Streak ikona Copy → Flame, Scheduled ikona FileText → Calendar
- `src/components/dashboard/sidebar.tsx` – Inbox nav item + Badge podpora:
  - **ICON_MAP**: Přidáno `inbox: MessageSquare`
  - **NavItem interface**: Nový optional prop `badge?: string`
  - **Render**: Badge variant="premium" se zobrazí vedle labelu pokud `item.badge` existuje
  - **Import**: `MessageSquare` z lucide-react, `Badge` z ui
- `src/app/[locale]/(dashboard)/inbox/page.tsx` – prázdná stránka Community Inbox:
  - **Design**: Glassmorphism karta s MessageSquare ikonou + placeholder text
  - **i18n**: Název z `nav.inbox`
- `src/app/[locale]/(dashboard)/layout.tsx` – Inbox v navItems:
  - Nový item: `{ href: "/inbox", label: navT("inbox"), icon: "inbox", badge: "NEW" }`
  - Pozice: mezi Kalendář a Účty
- `src/messages/cs.json` – nové klíče:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Skóre konzistence"
- `src/messages/en.json` – totéž v angličtině:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Consistency Score"
- `src/messages/uk.json` – totéž v ukrajinštině:
  - `nav.inbox` = "Вхідні"
  - `dashboard.consistencyScore` = "Бал консистентності"
- Build: úspěšný, žádné TypeScript chyby

### Krok 23 – Gamifikace a Redesign Fakturace (DOKONČENO)
- `src/components/dashboard/setup-guide.tsx` – nová komponenta "Dokončete nastavení":
  - **Design**: Skleněná karta (`bg-card/40 backdrop-blur-xl border-white/10 rounded-[24px]`) plavoucí v pravém dolním rohu
  - **Progress bar**: Gradient (indigo→purple) s animací Framer Motion, zobrazuje {completed}/{total} %
  - **Seznam úkolů**: 4 kroky s checkmarky – Vytvořit účet (vždy hotovo), Propojit první síť, Uložit první nápad, Naplánovat první post
  - **Logika**: Widget se zobrazí pouze pokud nejsou všechny kroky hotové; po dokončení zmizí
  - **Data**: Reálná data z DB (social_accounts count, posts count) – Supabase queries při mountu
  - **Dismiss**: X tlačítko pro zavření (state `dismissed`)
  - **Responzivita**: `bottom-20 right-4` na mobilu (nad bottom nav), `bottom-6 right-6` na desktopu
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – nová stránka fakturace:
  - **3 srovnatelné karty**: Free, Creator, Pro – přesně podle vzoru Buffer
  - **Styl karet**: `bg-card/40 backdrop-blur-xl border-white/5 rounded-[24px] p-8`
  - **Header karet**: Ikona (Sparkles/Zap/Crown) + název + popis + cena
  - **Ceny**: Free (zdarma), Creator (199 Kč/8 EUR/9 USD), Pro (499 Kč/20 EUR/22 EUR)
  - **Features list**: Checkmarky s hodnotami (účty, příspěvky/měsíc, šablony, analytika)
  - **Current Plan**: Badge "Aktuální" (emerald) na aktuálním tarifu
  - **Recommended**: Badge + indigo glow na Creator plánu
  - **CTA tlačítka**: "Upgrade" / "Odebírat" / "Aktuální" (disabled)
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – Client Component pro billing karty:
  - **Icon box**: Barevný (indigo) pro recommended, šedý pro ostatní
  - **Display price**: EUR jako primární měna (`{price}€`) + `/měsíc`
  - **Feature items**: Emerald checkmark + label + value
  - **Button varianty**: Default (indigo) pro recommended, outline pro ostatní
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace SetupGuide:
  - Import `SetupGuide` komponenty
  - Render `<SetupGuide locale={locale} />` v layoutu před MobileNav
  - Widget je fixed positioned – neovlivňuje layout
- `src/components/dashboard/mobile-nav.tsx` – optimalizace pro 6 ikon:
  - **Výška**: `h-[64px]` → `h-[56px]` (o 8px nižší)
  - **Distribuce**: `justify-around` → `justify-evenly` (rovnoměrné rozložení)
  - **Padding**: `px-4` → `px-1` (menší okraje)
  - **Ikony**: `w-6 h-6` → `w-5 h-5` (o 1px menší)
  - **Text**: `text-[10px]` → `text-[9px]`, `mt-1` → `mt-0.5`
  - **Active dot**: `bottom-1` → `bottom-0.5` (přiblížen k okraji)
  - **Výsledek**: 6 ikon (Přehled, Příspěvky, Kalendář, Účty, Analytika, Nastavení) se vejdou přirozeně
- `src/messages/cs.json` – nové i18n sekce:
  - `setup`: title, progress, createAccount, connectFirstNetwork, saveFirstIdea, scheduleFirstPost
  - `billing`: title, subtitle, currentPlan, free, creator, pro, perMonth, accounts, postsPerMonth, templates, analytics, support, unlimited, basic, advanced, priority, current, upgrade, downgrade, subscribe
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 68 – Refaktorování nastavení: Dropdown menu + odstranění vnitřního sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – Account Switcher přetvořen na DropdownMenu:
  - **Původní stav**: Statická karta s profilem + tlačítko Settings (redirect) + Upgrade
  - **Nový stav**: Celá karta je kliknutelný DropdownMenuTrigger
  - **DropdownMenuContent** (side="top", Premium Glass design):
    - Sekce ÚČET: Profil (User), Předvolby (SlidersHorizontal), Notifikace (Bell)
    - Sekce ORGANIZACE: Obecné (Building2), Fakturace (CreditCard)
    - Sekce FUNKCE: Štítky (Tag)
    - Separator + LogoutButton (LogOut)
  - **Design**: `backdrop-blur-xl`, `rounded-[20px]`, `bg-white/90 dark:bg-black/90`, shadow
  - **Nový prop**: `settingsLabels` (profile, preferences, notifications, general, billing, labels, accountLabel, organizationLabel, featuresLabel)
  - **Odstraněno**: Settings ikona jako samostatné tlačítko, Settings z ICON_MAP
- `src/app/[locale]/(dashboard)/layout.tsx` – předávání `settingsLabels` do Sidebar + MobileNav:
  - `settingsLabels` objekt z `settingsT` (getTranslations)
  - Sidebar i MobileNav dostávají stejné labels pro konzistenci
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – odstranění vnitřního sidebaru:
  - **Původní stav**: Flex layout s `SettingsSidebar` (w-56) + children ve flex-1
  - **Nový stav**: Jednoduchý kontejner `mx-auto w-full max-w-4xl` – obsah přes celou šířku, centrován
  - **Odstraněno**: Import `SettingsSidebar`, `getTranslations`, `params` prop
  - **Výsledek**: Nastavení bez vnořeného menu – navigace přes dropdown v sidebaru
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – mobilní responzivita:
  - **Karty**: `p-4 sm:p-6` (menší padding na mobilu)
  - **Hlavičky**: `text-base sm:text-lg` (menší font na mobilu)
  - **Spacing**: `mb-3 sm:mb-4` na labelích
  - **Email input**: `px-3 sm:px-4` + `truncate` pro dlouhé e-maily
  - **Badges**: `flex-shrink-0` aby se nemačkaly
  - **Tlačítka**: `flex-wrap` na Language buttons aby nepřetekly
  - **Container spacing**: `space-y-4 sm:space-y-6`
- `src/app/[locale]\(dashboard)\settings\profile\page.tsx` – responzivní hlavička:
  - **H1**: `text-xl font-bold sm:text-2xl md:text-3xl` (stupňovitý font)
  - **Spacing**: `space-y-4 sm:space-y-6`
- `src/components/dashboard/mobile-nav.tsx` – tlačítko Nastavení s DropdownMenu:
  - **Nový nav item**: Settings ikona jako 6th item v bottom bar
  - **DropdownMenu** (side="top", Premium Glass): Stejné sekce jako desktop sidebar
    - ÚČET: Profil, Předvolby, Notifikace
    - ORGANIZACE: Obecné, Fakturace
    - FUNKCE: Štítky
    - Logout (handleLogout přes Supabase client)
  - **Nový prop**: `settingsLabels` (stejný interface jako Sidebar)
  - **Active state**: `isSettingsPage` detekce + indigo glow + tečka
  - **Logout**: Inline `handleLogout` (createClient → signOut → redirect na login)
  - **Design**: `bg-black/90 backdrop-blur-xl` (vždy dark na mobilu)
- `src/components/settings/settings-sidebar.tsx` – komponenta již nepoužívána (zůstává v repo, nic nelomčí)
- Build: úspěšný, žádné TypeScript chyby

### Krok 67 – Oprava useFormState → useActionState (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – migrace na React 19 API:
  - **Příčina**: `ReactDOM.useFormState` byl přejmenován na `React.useActionState` v Next.js 16
  - **Řešení**: Import změněn z `react-dom` → `react`, obě volání `useFormState(...)` → `useActionState(...)`
- Build: úspěšný, žádné chyby

### Krok 66 – Oprava dvou chyb: script tag v layout + translateFn v Client Component (DOKONČENO)
- `src/app/layout.tsx` – oprava Console Error "Encountered a script tag while rendering React component":
  - **Příčina**: `<script>` tag v `<head>` není v Next.js App Router podporován – scripty v React componentech se nikdy neexecutují při client-side rendering
  - **Řešení**: `<script id="theme-init">` přesunuto z `<head>` přímo do `<body>` – theme initialization script běží před hydratací
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – oprava Runtime Error "Functions cannot be passed directly to Client Components":
  - **Příčina**: `authT` a `settingsT` byly funkce z `getTranslations()` předávané přímo do Client Component `ProfileForm` – funkce z Server Components nelze předat bez `"use server"`
  - **Řešení**: Místo funkcí se předávají již vyřešené stringy přes `labels` object (`{ email, emailVerified, emailNotVerifiedBadge, fullName, language, saved }`)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – přepsání interface + implementace:
  - **Nový interface**: `ProfileFormLabels` (stringy) místo `settingsT: any, authT: any` (funkce)
  - **Všechna volání**: `authT("email")` → `labels.email`, `settingsT("fullName")` → `labels.fullName`, atd.
- Build: úspěšný, žádné chyby

### Krok 21 – Úprava hlavní navigace + Sjednocení nastavení (DOKONČENO)
- `src/app/[locale]/(dashboard)/layout.tsx` – nová navigace:
  - **navItems pořadí**: Přehled → Příspěvky → Kalendář → Účty → Analytika
  - **Nastavení odstraněno** z hlavního menu – dostupné jen přes profil/kolečko dole
  - **full_name z DB**: `userFullName` se fetchuje z tabulky `users` (`select("onboarded, full_name")`) a předává se do Sidebar
  - **Sidebar user.name**: Nyní zobrazuje `full_name` z DB místo `user_metadata`
- `src/components/dashboard/sidebar.tsx` – Account Switcher (spodní karta):
  - Zobrazuje `user?.name` (full_name z DB) || "Uživatel"
  - E-mail zůstává pod jménem jako secondary info
  - Settings ikona → redirect na `/${locale}/settings`
- `src/components/dashboard/mobile-nav.tsx` – mobilní navigace:
  - Odstraněno "Nastavení" z bottom bar
  - Přidáno "Účty" (LinkIcon) – stejné pořadí jako desktop
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – Buffer-style settings layout:
  - **Vnitřní sidebar (podmenu)**: 3 sekce – Účet (Profil, Předvolby, Notifikace), Organizace (Obecné, Fakturace), Funkce (Štítky)
  - **Design**: Skleněný efekt (`bg-white/70 dark:bg-card/40 backdrop-blur-md`), `rounded-[20px]`, border
  - **Aktivní položka**: Indigo podsvícení + tečka vpravo (`bg-primary shadow-[0_0_8px]`)
- `src/components/settings/settings-sidebar.tsx` – nová komponenta:
  - Sekční hlavičky z i18n (`accountLabel`, `organizationLabel`, `featuresLabel`)
  - Ikony: User, SlidersHorizontal, Bell, Building2, CreditCard, Tag (lucide-react)
  - Aktivní stav: `bg-indigo-50 text-indigo-700` (light) / `dark:bg-white/[0.05] dark:border-white/10` (dark)
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – server component:
  - Fetchuje `full_name` + `language` z `users` tabulky
  - Renderuje `ProfileForm` s inicializovanými hodnotami
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – client component:
  - **Formulář jména**: Input + Button → Server Action `updateFullName`
  - **Formulář jazyka**: Select + Button → Server Action `updateLanguage` + "Přepnout" tlačítko
  - **Email display**: Read-only + verification badge (CheckCircle2/AlertCircle)
  - **Design**: Glassmorphism karty (`rounded-[20px]`, `bg-white/70 dark:bg-card/40`)
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – Server Actions:
  - `updateFullName(formData)`: Update `full_name` v `users` tabulce → `revalidatePath("/settings")`
  - `updateLanguage(formData)`: Update `language` v `users` tabulce → `revalidatePath("/settings")`
  - Validace: auth check, error handling s `useFormState`
- `src/app/[locale]/(dashboard)/settings/page.tsx` – redirect na `/settings/profile`
- `src/messages/cs.json` – nové klíče v `settings`:
  - `profileDescription`, `preferences`, `notifications`, `general`, `billing`, `labels`
  - `accountLabel`, `organizationLabel`, `featuresLabel`
  - `common.switch` = "Přepnout"
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Databáze**: Žádná migrace potřeba – `full_name` již existuje v tabulce `users` (001_initial_schema.sql)
- Build: úspěšný, žádné TypeScript chyby

### Krok 65 – Buffer-style Account Type Selection Modal (DOKONČENO)
- `src/components/account-type-modal.tsx` – nová komponenta pro výběr typu účtu (Buffer-style flow):
  - **Design**: Dialog s dvěma sloupci vedle sebe – Professional vs Personal
  - **Professional sloupec**: Zelený badge "Automatické odesílání & Notifikace", 3 funkce s ikonymi (Check, Users, BarChart3), indigo/purple gradient tlačítko
  - **Personal sloupec**: Šedý badge "Pouze přes notifikace", 1 funkce (Bell ikona), outline/ghost tlačítko
  - **Styl**: Premium Glass (backdrop-blur-xl, border-white/10, rounded-[20px]), glow efekt na Professional sloupci při hoveru
  - **i18n**: Všechny texty přes `t` props – subtitle, badge, titles, descriptions, buttons
  - **Platforma**: PlatformIcon + platformName v headeru modálu
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – integrace AccountTypeModal:
  - **Nové stavy**: `showTypeModal`, `typeModalPlatform` (id, name, icon)
  - **Klik na Instagram**: Otevírá AccountTypeModal místo přímého formuláře
  - **Klik na ostatní platformy**: Zůstává původní chování (přímý formulář s inputy)
  - **onProfessional + onPersonal**: Zatím obě vedou na stejný formulář (příprava pro OAuth v budoucnu)
- `src/messages/cs.json` – nové klíče v `accounts`: `howToConnect`, `professional`, `professionalDesc`, `personal`, `personalDesc`, `autoPostingBadge`, `notificationsBadge`, `autoPublishing`, `autoPublishingDesc`, `communityReplies`, `communityRepliesDesc`, `postMetrics`, `postMetricsDesc`, `onlyNotifications`, `onlyNotificationsDesc`, `connectProfessional`, `setupPersonal`, `selectTypeSubtitle`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 64 – LocaleSwitcher Fix + Premium Light Login Page Redesign (DOKONČENO)
- `src/components/locale-switcher.tsx` – oprava "login" textu v LocaleSwitcheru:
  - **Příčina**: `usePathname()` vrací `/login` bez locale prefixu v některých případech → `split("/")[1]` vrátilo `"login"` → fallback byl `"login"` místo názvu jazyka
  - **Řešení**: `pathname.split("/").filter(Boolean)` + validace proti seznamu locale kódů – `locales.find((l) => l.code === parts[0])?.code || "cs"`
  - **Fallback**: `"cs"` (Čeština) místo `currentLocale` (který mohl být `"login"`)
  - **Accessibility**: `aria-label={currentLabel}` na Buttonu pro screen readery
  - **Vizuál**: `text-muted-foreground` na labelu jazyka pro jemnější vzhled
- `src/app/[locale]/(auth)/login/page.tsx` – Premium Light redesign:
  - **Pozadí stránky**: `bg-slate-50 dark:bg-black` – jemná šedobílá ve světlém režimu
  - **Grid pattern**: SVG grid s `bg-slate-200/50` v light modu – viditelnější mřížka
  - **Formulářová karta**: `bg-white/60 backdrop-blur-xl border border-white shadow-xl rounded-[32px] p-10` – bílá glass karta s hloubkou
  - **Dark mode**: Karta je transparentní (`dark:bg-transparent dark:shadow-none dark:rounded-none`) – žádná změna dark vizuálu
- `src/components/auth/email-signin.tsx` – Light/Dark adaptivní inputy:
  - **Divider linky**: `bg-slate-200 dark:bg-white/10` – viditelné v obou režimech
  - **Inputy**: `bg-white/80 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-900 dark:text-foreground`
  - **Focus**: `focus:border-indigo-500 dark:focus:border-indigo-500/50` – plně indigo v light, jemnější v dark
  - **Submit tlačítko**: `bg-indigo-500 dark:bg-white text-white dark:text-black hover:bg-indigo-600 dark:hover:bg-white/90` – barevné v light, bílé v dark
- `src/components/auth/login-visual.tsx` – Dashboard mock Light/Dark redesign:
  - **Grid pattern**: `opacity-[0.06] dark:opacity-[0.04]` – viditelnější v light modu, gray stroke (`#a0a0a0`)
  - **Glow efekty**: `bg-purple-200/40 dark:bg-purple-500/20` a `bg-indigo-200/40 dark:bg-indigo-500/15` – silnější záře v light
  - **Hlavní záře**: `from-indigo-200/40 via-purple-200/30 to-blue-200/20 dark:from-purple-500/30 dark:via-indigo-500/20 dark:to-blue-500/10` – indigo glow v light, purple v dark
  - **Dashboard karta**: `border-white/50 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md dark:backdrop-blur-xl shadow-lg dark:shadow-none`
  - **Texty v kartě**: `text-slate-900 dark:text-white` a `text-slate-500 dark:text-white/60` – černé v light, bílé v dark
  - **Graf bary**: Střídavé `bg-slate-200/80 dark:bg-white/25` a `bg-indigo-400/60 dark:bg-white/25` – slate/indigo v light, bílé v dark
  - **Metriky karty**: `bg-white/50 dark:bg-white/10` – silnější v light
  - **Floating karty**: `border-white/60 dark:border-white/20 bg-white/50 dark:bg-white/5 shadow-md dark:shadow-none`
  - **Ikony**: `text-emerald-500 dark:text-emerald-300` a `text-amber-500 dark:text-amber-300` – sytější v light
- Build: úspěšný, žádné TypeScript chyby

### Krok 63 – Light Mode: "Milky Glass" Design Overhaul (DOKONČENO)
- `src/components/ui/dialog.tsx` – Milky Glass modal:
  - **Overlay**: `bg-black/20 dark:bg-black/60` – tmavší overlay pro lepší fokus na modal
  - **DialogContent**: `bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – mléčné sklo ve světlém režimu
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín light, výrazný dark
  - **Text**: `text-slate-900 dark:text-white` – plná černá v light modu
  - **Radius**: `rounded-[20px]` – konzistentní s design systémem
- `src/components/edit-post-dialog.tsx` – Milky Glass edit modal:
  - **DialogContent**: `bg-white/80 dark:bg-card/40` + shadow + border pro Milky Glass
  - **Textarea**: `text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus:bg-white focus:border-indigo-500/30` – plná černá barva textu, jemné bordery
  - **Inputy (location, tags)**: totéž – `bg-white/50` → `focus:bg-white`, `border-black/5` → `focus:border-indigo-500/30`
  - **Platformy**: Přirozené barvy ikon ve světlém režimu (Instagram #E1306C, Facebook #1877F2, Twitter #1DA1F2, LinkedIn #0A66C2, YouTube #FF0000, TikTok #010101)
  - **Platform pill**: `bg-white/60 dark:bg-white/[0.03] text-slate-700` – ne šedé mrtvé, ale živé s barevnými ikonami
  - **Platform pill selected**: `bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300`
- `src/components/ui/date-time-picker.tsx` – Kalendář NAKONEC bílý v light modu:
  - **Trigger button**: `bg-white/50 dark:bg-white/[0.03] border-black/5 dark:border-white/10`
  - **Kalendář kontejner**: `bg-white/95 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – BÍLÝ pozadí v light modu!
  - **Text**: `text-slate-900 dark:text-white` na celém kontejneru
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl`
  - **Navigace měsíce**: hover `bg-black/5 dark:bg-white/10`
  - **Dny v kalendáři**: hover `bg-black/5 dark:bg-white/10`, today `text-indigo-600 dark:text-indigo-300`
  - **Vybraný den**: indigo gradient + `text-white` (nezměněno)
  - **Divider**: `bg-black/5 dark:bg-white/5`
  - **TimeSelect trigger**: `bg-white/60 dark:bg-[#09090b] border-black/5 dark:border-white/10`
  - **TimeSelect dropdown**: `bg-white/95 dark:bg-[#0b0b0b]` – BÍLÝ v light modu!
  - **TimeSelect položky**: hover `bg-black/5 dark:bg-white/[0.06]`, selected `bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400`
- `src/app/globals.css` – Grid + Glass vylepšení:
  - **Grid pattern light**: `stroke='%23a0a0a0'` (jemně šedá místo černé), `opacity: 0.05` (z 0.03)
  - **Glass card light**: `rgba(255,255,255,0.8)` (z 0.7), `blur(16px)` (z 12px), `border rgba(0,0,0,0.05)` (z 0.08)
  - **Glass modal light**: `rgba(255,255,255,0.9)` (z 0.85), `border rgba(0,0,0,0.05)` (z 0.08)
- Build: úspěšný, žádné TypeScript chyby

### Krok 62 – Time Picker: Custom dropdowny pro HH/MM (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – oprava vizuální chyby v dark modu:
  - **Nová komponenta `TimeSelect`**: Radix Popover based dropdown – plně stylovatelná alternativa k nativnímu `<select>`
  - **Trigger button**: `bg-black/80 dark:bg-[#09090b]` pozadí, `border-white/10`, `rounded-lg`, `text-foreground` – ladí s tmavým pozadím
  - **Popover seznam**: `bg-black/80 dark:bg-[#0b0b0b]` + `backdrop-blur-xl` + `shadow-2xl` – tmavý skleněný dropdown
  - **Aktivní hodnota**: `bg-indigo-600/20 text-indigo-400 font-medium` – indigo highlight vybrané položky
  - **Hover**: `hover:bg-white/[0.06]` – jemný hover efekt na položkách
  - **Scroll**: `max-h-52 overflow-y-auto` + auto-scroll na vybranou položku při otevření
  - **Labels HH/MM**: `text-muted-foreground/50` (z /40) – jemně šedé, nepřebíjejí čísla
  - **z-index**: `z-[60]` pro time dropdowns – nad hlavním popoverem kalendáře (`z-50`)
  - **Příčina problému**: Nativní `<select>` elementy renderují `<option>` v nativním browseru – Tailwind třídy se na dropdown menu vztahují jen částečně, což vedlo k bílému pozadí v dark modu
- Build: úspěšný, žádné TypeScript chyby

### Krok 15.3 – Bezpečnostní limity pro média (DOKONČENO)
- `src/hooks/use-media-upload.ts` – striktní limity velikosti souborů:
  - **Obrázky**: max 5 MB (dříve 50 MB)
  - **Videa**: max 20 MB (dříve 50 MB)
  - **Konstanty**: `MAX_IMAGE_SIZE = 5MB`, `MAX_VIDEO_SIZE = 20MB`
  - **Validace typů**: Rozlišené pole extenzí `ALLOWED_IMAGE_EXTENSIONS` (jpg, jpeg, png, webp, gif, svg) a `ALLOWED_VIDEO_EXTENSIONS` (mp4, mov)
  - **MIME typy**: `ALLOWED_IMAGE_MIMES` (jpeg, png, webp, gif, svg+xml) a `ALLOWED_VIDEO_MIMES` (mp4, quicktime)
  - **Funkce**: `getFileKind()` (detekce typu souboru), `getFileSizeLimit()` (limit podle typu), `isFileTooLarge()` (kontrola velikosti)
  - **Validace před uploadem**: `addFiles()` kontroluje velikost před přidáním do queue – oversized soubory se zahodí + toast error
  - **Toast messages**: Rozlišené pro obrázky (`fileTooLargeImage`) a videa (`fileTooLargeVideo`)
  - **Upload flow**: Client-side (browser → Supabase Storage) přes `createBrowserClient` z `@supabase/ssr` – žádné Vercel serverless funkce se nezatěžují
- `src/messages/cs.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích: calendar + posts)
- `src/messages/en.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/messages/uk.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/components/edit-post-dialog.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- **Bezpečnost**: Uživatelé již nemohou vyčerpat Supabase Storage velkými soubory. Limit 5MB pro fotky a 20MB pro videa je dostatečný pro free tier.

### Krok 61 – Light/Dark Mode: Dokončení vyladění světlého režimu (DOKONČENO)
- `src/app/globals.css` – oprava invalidní CSS syntaxe:
  - `.calendar-day-hover` mělo `hover: {}` (není validní CSS, to je SCSS/Tailwind @layer syntax)
  - Nahrazeno za `&:hover` (nesting syntax podporovaná v Tailwind CSS v @layer utilities)
  - Komentář rozšířen: "light: subtle gray, dark: subtle white"
- **Ověření stavu předchozí relace** (krok 60 a dále):
  - Grid patterny ve 4 dashboard stránkách (`posts/[id]`, `posts/new`, `accounts`, `templates/new`) – už mají obě varianty (black stroke pro light, white stroke pro dark) ✅
  - Dashboard layout `layout.tsx` – grid pattern v `<main>` už má `#80808008` (light) / `#ffffff08` (dark) ✅
  - Cookie consent – kategorie mají `bg-gray-50 dark:bg-white/5` a `border-gray-200 dark:border-white/10` ✅
  - Sidebar – aktivní item `bg-indigo-50 dark:bg-white/[0.05]`, user card `bg-gray-50 dark:bg-accent/50` ✅
  - Kalendář – mřížka, buňky, hover efekty, filtry, modal – vše s light/dark variantami ✅
  - Post card – `bg-white/80 dark:bg-card/40`, border, shadow – adaptivní ✅
  - Login visual – grid pattern s `opacity-[0.03] dark:opacity-[0.04]` ✅
  - LocaleSwitcher – žádná specifická barevná úprava potřeba, používá Tailwind tokens ✅
- Build: úspěšný, žádné TypeScript chyby

### Krok 60 – Kalendář: Hover Preview Pozice + Light/Dark Mode + Cookie Consent (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy hover náhledu v kalendáři:
  - **Pozice náhledu relativní k příspěvku**: `handlePostHover` nyní používá `getBoundingClientRect()` pro získání pozice karty příspěvku a umísťuje náhled ~12px vedle ní (vpravo) nebo nad/pod ni podle dostupného místa
  - **Smart positioning**: Pokud náhled přesahuje pravý okraj viewportu, přesune se vlevo od karty. Pokud není místo ani vlevo, zobrazí se centrováno pod kartou
  - **Adaptivní design (Light/Dark mode)**: Karta náhledu nyní používá `bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny pro hloubku**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín v light modu, výraznější v dark modu
  - **Texty adaptivní**: `text-foreground/80` (černé v light, bílé v dark), `border-t border-black/5 dark:border-white/10`
  - **Media placeholder**: `bg-black/5 dark:bg-white/5` pro loading stav obrázků
- `src/components/cookie-consent.tsx` – adaptivní light/dark mode pro Cookie Consent:
  - **Floating card**: `bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`
  - **Link barva**: `text-foreground` místo `text-white` (aby byl v light modu černý)
  - **Preferences Dialog**: `bg-white/90 dark:bg-black/60 backdrop-blur-2xl border-black/5 dark:border-white/10`
  - **Cookie category cards**: `border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
  - Všechny 4 kategorie (Necessary, Functional, Analytics, Advertising) mají adaptivní styl
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-06 (předchozí záznamy)

### Krok 15.2 – Logika nahrávání médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – kompletní vylepšení hook pro nahrávání médií:
  - **i18n podpora**: Hook nyní přijímá `labels` (MediaUploadLabels) pro toast messages – žádné hardcoded texty
  - **Validace formátů**: Nová funkce `isValidMediaFile` kontroluje povolené formáty (jpg, jpeg, png, webp, mp4, mov) + MIME typy
  - **ALLOWED_EXTENSIONS**: `[".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"]`
  - **Toast messages**: `tooManyFiles`, `uploadSuccess`, `uploadError`, `fileDeleted`, `invalidFileType`
  - **removeItem**: Bezpečnější – try/catch kolem URL parsing, revoke ObjectURL jen pro non-ready items
  - **loadExistingUrls**: Revoke ObjectURL jen pro lokální preview (status !== "ready")
  - **Default labels**: Fallback na angličtinu pokud labels nejsou předány
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace uploadLabels:
  - `uploadLabels` objekt z `t()` předáván do `useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels)`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace uploadLabels:
  - Stejný pattern: `uploadLabels` z `t()` → `useMediaUpload`
- `src/components/edit-post-dialog.tsx` – integrace uploadLabels + rozšířený interface:
  - `EditPostDialogProps.tLabels` rozšířen: `uploadSuccess`, `fileDeleted`, `invalidFileType`
  - `uploadLabels` sestaven z `tLabels` s fallbacky
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – rozšířené interface:
  - `PostCard.tLabels` a `PostsList.tLabels`: přidány `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/posts/page.tsx` – tLabels rozšířen:
  - Nové klíče: `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – rozšířený interface + tLabels:
  - `CalendarViewProps.tCalendar`: přidány `uploadSuccess`, `uploadError`, `uploading`, `fileTooLarge`, `fileDeleted`, `invalidFileType`, `dropMedia`
  - EditPostDialog tLabels: hodnoty z tCalendar místo prázdných řetězců
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – tCalendar rozšířen:
  - Nové klíče: `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType`
- `src/messages/cs.json` – nové klíče v namespace `posts` a `calendar`:
  - `tooManyFiles`, `fileDeleted`, `invalidFileType` (posts)
  - `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType` (calendar)
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Upload flow**: User vybere soubory → validace formátu → generování unikátní cesty `{userId}/{timestamp}-{filename}` → upload do `post-media` bucket → public URL → uložení do `media_urls` v DB
- **Limit**: Max 10 souborů na příspěvek, max 50MB na soubor
- **UX**: Spinner během nahrávání, CheckCircle2 po úspěchu, X tlačítko pro odstranění, toast notifikace
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-05

### Krok 59 – Univerzální Edit Modal + Kalendář: Drafty + Filtry statusu (DOKONČENO)
- `src/components/edit-post-dialog.tsx` – nová sdílená komponenta `EditPostDialog`:
  - Slouží jak pro editaci, tak pro vytvoření nového příspěvku
  - Používá se jak z kalendáře, tak ze seznamu příspěvků
  - Podpora: content, platformy, scheduled_at, status, location, tags, media (drag & drop + upload do Supabase Storage)
  - useMediaUpload hook pro nahrávání médií
  - Status pills (draft/scheduled/published/failed) – pouze v edit mode
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Koncepty (draft) viditelné**: Příspěvky se statusem `draft` se zobrazují s nižší opacitou (`opacity-60`)
  - **Filtry statusu**: Nové pill filtry (Vše, Koncept, Naplánované, Publikované, Neúspěšné) pod platform filtry
  - **Kliknutí na příspěvek**: Otevírá `EditPostDialog` modal místo redirectu na `/posts/[id]`
  - **activeStatusFilter**: Lokální stav pro UI filtr statusu (nezávislý na URL)
  - **Post interface rozšířen**: location, tags, media_urls
  - **getPostsForDayEffective**: Drafty bez `scheduled_at` se zobrazují v dnešním dni
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – odstraněn filtr `.neq("status", "draft")`:
  - `selectedStatus` se předává z URL searchParams (`?status=draft`)
  - Nové tCalendar klíče: editPost, postUpdated, addMedia
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – integrace EditPostDialog:
  - Tlačítko "Upravit" (ikona tužky) otevírá modal místo redirectu přes Link
  - PostCard přijímá `tLabels` prop a předává do EditPostDialog
  - PostsList přijímá `tLabels` prop a předává do PostCard
  - PostListItem rozšířen: location, tags, media_urls
- `src/app/[locale]/(dashboard)/posts/page.tsx` – rozšířené mapování příspěvků:
  - location, tags, media_urls se předávají do PostsList
  - tLabels prop s všemi potřebnými i18n klíči
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče v calendar namespace:
  - `filterAll`, `editPost`, `postUpdated`, `addMedia`
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-04

### Krok 58 – Oprava ukládání štítků (tags) (DOKONČENO)
- **Kořen problému**: Uživatel napsal tag do inputu a klikl na "Uložit" bez Enter/Space. Text zůstal v `tagDraft` a nikdy se nekomitoval do `tags` pole → do DB se uložilo prázdné pole.
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` (edit post):
  - **handleSave**: Před uložením se commitne zbylý `tagDraft` do `finalTags` (s normalizací + deduplikace)
  - `setTagDraft("")` po commitu
  - `updatePost` dostává `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}` – tag se commitne i při ztrátě fokusu
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` (new post):
  - **handleSubmit**: Stejný fix – commit `tagDraft` → `finalTags` před `createPostAction`
  - `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}`
- `src/lib/actions/posts.ts` – server actions už `tags` správně zpracovávají (žádná změna potřeba)
- Migrace `005_add_location_tags_to_posts.sql` – sloupec `tags TEXT[] DEFAULT '{}'` existuje
- Build: úspěšný, žádné TypeScript chyby

### Krok 57 – Upload médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – nový custom hook pro nahrávání médií:
  - **uploadFile**: Upload souboru do Supabase Storage bucket `post-media` s unikátní cestou `{userId}/{timestamp}-{filename}`
  - **addFiles**: Přidání souborů s validací (image/video, max 50MB, max 10 souborů), automatický upload po přidání
  - **removeItem**: Odstranění souboru + revoke ObjectURL + smazání ze storage
  - **loadExistingUrls**: Načtení existujících URL z DB (pro editaci příspěvků)
  - **getMediaUrls**: Vrátí pole public URL všech ready souborů
  - **hasUploading**: Indikace zda probíhá upload (blokuje odeslání formuláře)
  - **Stavy**: `uploading` (spinner) → `ready` (CheckCircle2) / `error` (toast error)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace useMediaUpload:
  - Drag & drop zóna s vizuální feedback (border-indigo při drag)
  - Preview grid (3/4 sloupce) s thumbnails, upload progress overlay, success indicator
  - File size validation (50MB limit) + toast error
  - Blocking upload při submit – toast.info("Nahrávám...")
  - mediaUrls se předávají do createPostAction
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace useMediaUpload:
  - loadExistingUrls při načtení příspěvku z DB (media_urls pole)
  - Stejný UI jako new post (drag & drop, preview grid, stavy)
  - mediaUrls se předávají do updatePost
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `posts.uploading`, `posts.uploadSuccess`, `posts.uploadError`, `posts.fileTooLarge`
- Build: úspěšný, žádné TypeScript chyby

### Krok 56 – Kalendář: Oprava mobilního zobrazení (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy mobilního Agenda View:
  - **Navigace měsíci**: Šipky nyní posouvají o celý měsíc (`previousMonth`/`nextMonth`) místo o 1 den
  - **Větší touch-targety**: Šipky zvětšeny na `h-10 w-10` (40x40px) s ikonami `h-5 w-5` pro snadné trefení palcem
  - **Sticky hlavička**: Hlavička s měsícem a šipkami je `sticky top-0` s `backdrop-blur-xl` – zůstává vidět při scrollování dnů
  - **Všechny dny měsíce**: Nový `mobileAgendaDays` useMemo generuje VŠECHNY dny aktuálního měsíce (startOfMonth → endOfMonth), nejen dny s příspěvky
  - **Prázdné dny**: Dny bez příspěvků zobrazují "Žádné příspěvky" + malé `+` tlačítko. Kliknutí na celý řádek otevře modal pro nový příspěvek
  - **Plně scrollovatelný seznam**: Seznam dnů má `max-h-[calc(100vh-280px)]` a `overflow-y-auto`
  - **České měsíce 100%**: Název měsíce v hlavičce z `months[month]` (props z `t.raw("months")`) + v seznamu dnů `months[day.getMonth()]` – vždy z lokálních překlادů
  - **Jeden kontejner**: Celý mobilní view je v jednom `rounded-[20px]` kontejneru místo dvou samostatných karet
- Build: úspěšný, žádné TypeScript chyby

### Krok 55 – Kalendář: Modal pro nový příspěvek + oprava filtrů + i18n + UI polish (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Modal Dialog pro nový příspěvek**: Kliknutí na "+ Přidat příspěvek" v mobilním Agenda View otevírá modal s formulářem místo redirectu na /posts/new
    - Formulář: obsah, platformy (pill tlačítka s ikonami), lokace, štítky, DateTimePicker
    - Tlačítka: Koncept / Naplánovat / Publikovat (stejný styl jako /posts/new)
    - Po úspěchu: toast + reload stránky
    - Reset formuláře při zavření modálu
  - **Oprava filtrů platforem**: UI tlačítka nyní používají `activePlatformFilter` (lokální stav) místo `selectedPlatform` (props z URL) – filtry fungují správně
  - **Oprava příspěvků v gridu**: Desktop grid používá `getPostsForDayEffective` (respektuje filtry) místo `getPostsForDay`
  - **Kliknutí na den**: Zachováno – redirect na `/posts/new?date=YYYY-MM-dd`
  - **Česká lokalizace Agenda View**: `formatAgendaDate` s `date-fns/locale/cs` – dny a měsíce v češtině (čtvrtek, 6. května 2026)
  - **Lokalizace množného čísla**: CS (příspěvek/příspěvky/příspěvků), UK (публікація/публікації/публікацій), EN (post/posts)
  - **Lokalizace "+ more"**: další / більше / more
  - **UI polish**: Lepší kontrast mřížky (`border-white/10`), zvýraznění dneška (`bg-indigo-500/5 ring-indigo-500/20`), tmavší dny mimo měsíc (`bg-black/30`)
  - **Nové stavy**: `formContent`, `formPlatforms`, `formScheduledAt`, `formLocation`, `formTags`, `formTagDraft`, `formLoading`, `formError`
  - **Nové funkce**: `handleOpenNewPostModal`, `handleToggleFormPlatform`, `handleCommitTag`, `handleRemoveTag`, `handleFormSubmit`
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – rozšířený `tCalendar` props o 16 nových klíčů
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `calendar.addPost`, `calendar.newPost`, `calendar.content`, `calendar.contentPlaceholder`
  - `calendar.selectPlatforms`, `calendar.saveDraft`, `calendar.schedule`, `calendar.publishNow`
  - `calendar.scheduledAt`, `calendar.saving`, `calendar.addTags`, `calendar.locationPlaceholder`
  - `calendar.postCreated`, `calendar.errorSaving`, `calendar.characterCount`, `calendar.maxFilesReached`
- Build: úspěšný, žádné TypeScript chyby

### Krok 54 – Kalendář: Mobile Agenda View + Klikání na dny a příspěvky (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní přepracování:
  - **Desktop (lg+)**: Měsíční/týdenní mřížka zachována (hidden lg:block)
  - **Mobile (pod lg)**: Nový Agenda View – vertikální seznam dnů s příspěvky
    - Navigace: šipky pro posun dnů, název měsíce a roku
    - Prázdný stav: ikona kalendáře + hláška "Žádné příspěvky" (lokalizováno)
    - Dny s příspěvky: kroužek s číslem dne (gradient pro dnes), název dne, počet příspěvků
    - Karty příspěvků: ikona platformy + obsah + čas, barevné statusy (published/scheduled/failed)
    - Tlačítko "+ Přidat příspěvek" pod každým dnem
  - **Kliknutí na den** (desktop + mobile): redirect na `/posts/new?date=YYYY-MM-dd`
  - **Kliknutí na příspěvek**: `stopPropagation` + redirect na `/posts/[id]`
  - **Filtry platforem**: zachovány, funkční na obou zobrazeních
  - **Navigace Měsíc/Týden**: pouze desktop (hidden lg:flex)
- `src/messages/cs.json`, `en.json`, `uk.json` – klíč `calendar.noPostsThisDay` (přidán v předchozí relaci)
- Build: úspěšný, žádné TypeScript chyby

### Krok 53 – DB Sync: Média, Štítky, Lokace (DOKONČENO)
- `supabase/migrations/005_add_location_tags_to_posts.sql` – nová migrace:
  - Přidány sloupce `location TEXT DEFAULT NULL` a `tags TEXT[] DEFAULT '{}'` do tabulky `posts`
- `src/lib/actions/posts.ts` – rozšířené server actions:
  - `createPostAction` – nově přijímá a ukládá `location`, `tags` (kromě již existujícího `mediaUrls`)
  - `updatePost` – nově přijímá a aktualizuje `location`, `tags`
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `handleSubmit` předává do `createPostAction`:
  - `location` z inputu, `tags` z badge seznamu, `mediaUrls` z dropzóny (jména souborů)
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku:
  - useEffect načítá z DB i `location`, `tags`, `media_urls`
  - `handleSave` předává do `updatePost` všechny tři pole
- **Poznámka:** Média se ukládají jako jména souborů. Pro produkci bude potřeba upload do Supabase Storage
- Build: úspěšný, žádné TypeScript chyby

### Krok 52 – Kalendář pro plánování obsahu (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – nová Server Component stránka:
  - Načítá příspěvky z DB (`posts` tabulka) filtrované podle `user_id` a `status != draft`
  - Předává data do Client Component `_calendar-view` s lokalizací
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – Client Component s interaktivním kalendářem:
  - **Mřížka kalendáře**: 7 sloupců (Po-Ne), `border border-white/5`, glassmorphism (`bg-card/40 backdrop-blur-md rounded-[20px]`)
  - **Hlavička**: Šipky pro přepínání měsíců/týdnů, název měsíce lokalizovaný, přepínač Měsíc/Týden
  - **Příspěvky v buňkách**: Skleněné karty (`bg-indigo-500/20`) s ikonou platformy, časem a ukázkou obsahu
  - **Status barvy**: published = emerald, scheduled = indigo, failed = red
  - **Filtry platforem**: Pill tlačítka nad kalendářem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok) s ikonami
  - **Dnes**: Gradient kroužek (`from-indigo-600 to-purple-600`) s glow efektem
  - **Navigace**: `date-fns` pro generování dnů v měsíci/týdnu, `weekStartsOn: 1` (pondělí)
- `src/components/dashboard/sidebar.tsx` – přidána `Calendar` ikona do `ICON_MAP`
- `src/app/[locale]/(dashboard)/layout.tsx` – přidána položka Kalendář do `navItems` a `mobileNavItems`
- `src/components/dashboard/mobile-nav.tsx` – přidána položka Kalendář do spodního menu
- `src/messages/cs.json`, `en.json`, `uk.json` – nové sekce `calendar.*` (title, subtitle, month, week, weekdays, months, filtry)
- `nav.calendar` přidán do všech tří jazyků
- Build: úspěšný, žádné TypeScript chyby

### Krok 49 – Premium DateTimePicker – Redesign kalendáře (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – nová komponenta:
  - **Trigger tlačítko**: Glass styl (`bg-white/[0.03] border-white/10 rounded-xl h-12`), ikona kalendáře vlevo, vybrané datum textem uprostřed, ikona hodin vpravo
  - **Popover**: `bg-black/80 backdrop-blur-xl border border-white/10 rounded-[20px] p-4 shadow-2xl` – premium tmavý popover s blur efektem
  - **Kalendář**: Vlastní grid 7xN, bílé čísla, vybraný den s indigo-purple gradientem + glow (`shadow-[0_0_12px_rgba(99,102,241,0.4)]`), hover `bg-white/10 rounded-lg`, dnes vyznačen indigo borderem
  - **Navigace měsíců**: ChevronLeft/ChevronRight šipky, název měsíce lokalizovaný (`date-fns/locale/cs`, `uk`, `enUS`)
  - **Výběr času**: Dvě select pole (HH : MM) s hodnotami 0-23 a 00/15/30/45, glass styl, custom chevron ikona
  - **Lokalizace**: Český/anglický/ukrajinský kalendář přes `date-fns` locale + ruční weekDays (Po-Ne / Mo-Su / Пн-Нд)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- **Dependence**: `date-fns`, `@radix-ui/react-popover` (nově nainstalovány)
- Build: úspěšný, žádné TypeScript chyby

### Krok 50 – Posts Page: Prémiový feed karet + animace (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx`
  - Kontejner stránky omezen na `max-w-3xl mx-auto` (už není roztažený přes celou obrazovku)
  - Seznam příspěvků přepojen na client list komponentu kvůli animacím a plynulému mazání
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`
  - Nová struktura karty: header (platform icon + status badge + akce), výrazný content (`text-lg`), footer s border-top (created date + scheduled time s ikonou hodin)
  - Styl karty dle specifikace (`rounded-[24px]`, `bg-card/40`, `backdrop-blur`, jemný indigo hover border)
  - Framer Motion: `<AnimatePresence>` + enter/exit animace (fade-in + slide-up, při smazání plynulý exit)
  - Mazání: po úspěchu se karta okamžitě odstraní ze seznamu (bez refresh)

### Krok 51 – Editor příspěvků: Média, Lokace, Štítky (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - Přidána sekce Médií pod pole Obsah: drag & drop zóna (dashed border, glass hover) + náhledy v gridu + mazání
  - Přidán input pro Lokaci (MapPin vlevo) pod výběr platforem
  - Přidána sekce Štítky: Enter/mezerník vytvoří tag odznáček s křížkem, indigo/purple gradient
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - Sjednocen vizuál na prémiový glass layout a doplněny stejné sekce (Média, Lokace, Štítky)
- `src/messages/cs.json`, `en.json`, `uk.json`
  - Nové i18n klíče: `addMedia`, `locationPlaceholder`, `addTags`, `maxFilesReached`

## 2026-05-03

### Krok 48 – Výpis příspěvků z databáze (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní přepracování:
  - **Načítání z DB**: Query nyní filtruje podle `user_id` aktuálního uživatele (`.eq("user_id", user.id)`) – uživatel vidí pouze své příspěvky
  - **Řazení**: `order("created_at", { ascending: false })` – nejnovější první
  - **Filtry**: Pills filtry s novými i18n klíči (`statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`)
  - **Empty State**: Zachován krásný vizuální prázdný stav s velkou ikonou `FileText` a fialovou září
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – nová Client Component pro karty příspěvků:
  - **Design**: Premium Glass (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[20px] p-6`)
  - **Obsah**: Text příspěvku (content, max 200 znaků preview), ikony platforem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok), datum vytvoření, čas naplánování (Calendar ikona)
  - **Status Badge**: Barevné odznaky – draft (šedý), scheduled (indigo/modrý), published (zelený/emerald), failed (červený/red)
  - **Akce**: Edit (Edit ikona) + Delete (Trash2 ikona s `confirm()` dialogem)
  - **Lokalizace dat**: `toLocaleDateString()` s locale podle jazyka (cs-CZ, uk-UA, en-US)
- `src/lib/actions/posts.ts` – oprava `deletePost`:
  - Přidán auth check (`supabase.auth.getUser()`)
  - Přidán `.eq("user_id", user.id)` – lze smazat pouze vlastní příspěvky
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`, `deleteConfirm`
- **LocaleSwitcher**: Zkontrolováno – kód je správný, používá `locales.find()` pro labely. Žádný "login" bug nebyl nalezen (pravděpodobně již opraven dříve)
- Build: úspěšný, žádné TypeScript chyby

### Krok 47 – Přechod na klasický Login (E-mail + Heslo) (DOKONČENO)
- `src/components/auth/email-signin.tsx` – kompletní přepsání: odstraněn Magic Link (OTP) systém, nahrazen klasickým loginem s heslem (`signInWithPassword`), přidána registrace (`signUp`), přepínač režimů signin/signup, pole pro heslo s toggle visibility (Eye/EyeOff), validace email verification (pokud uživatel nemá ověřený e-mail, dostane chybovou hlášku + automatické odhlášení), redirect po registraci na `/[locale]/dashboard`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové i18n klíče: `signIn`, `signUp`, `signingIn`, `emailNotVerified`, `invalidCredentials`, `signInError`, `signUpError`, `emailAlreadyExists`, `checkEmailToVerify`, `emailVerified`, `emailNotVerifiedBadge` – odstraněny staré OTP klíče (`checkEmailTitle`, `checkEmailDesc`, `sendingEmail`, `rateLimitExceeded`, `tryAgainIn`, `otpSendError`)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – do sekce Profil přidán řádek s e-mailem a verification badge (zelený „Ověřen" s CheckCircle2 vs. oranžový „Neověřen" s AlertCircle)
- Design: Inputy s ikonami (Mail, Lock) vlevo, glassmorphism styl (`bg-white/[0.03]`, `rounded-2xl`), tlačítko „Přihlásit se" / „Zaregistrujte se", odkazy „Zapomněli jste heslo?" a „Nemáte účet? Zaregistrujte se"
- Build: úspěšný, žádné TypeScript chyby

### Krok 8.1 – Login: Přidání e-mailu (UI + i18n) (DOKONČENO)
- `src/app/[locale]/(auth)/login/page.tsx` – pod Google tlačítko přidán divider „nebo“, e-mail input + CTA a vrácen privacy disclaimer s odkazem na `/privacy`
- `src/components/auth/email-signin.tsx` – nový klientský blok pro přihlášení e-mailem přes Supabase OTP (magic link) včetně designu inputu a tlačítka
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `auth.or`, `auth.emailPlaceholder`, `auth.continueWithEmail`, `auth.privacyDisclaimer`

### Krok 8.2 – Login: Magic Link logika a redesign rozložení (DOKONČENO)
- `src/components/auth/email-signin.tsx` – implementována logika Supabase Magic Link (`signInWithOtp`), přidán Success View s ikonou obálky a fialovou září, aktualizován stav tlačítka při načítání („Odesílám...“) a vizuální polish (čistě bílé tlačítko, jemný border inputu)
- `src/app/[locale]/(auth)/login/page.tsx` – přesunut Privacy Disclaimer z patičky přímo pod blok přihlášení e-mailem pro lepší vizuální celistvost
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro Success View (`checkEmailTitle`, `checkEmailDesc`) a stav odesílání (`sendingEmail`)
- Sjednocení login bloku do jednoho vycentrovaného celku

### Krok 8.2.1 – Login: UX pro Supabase rate limit (DOKONČENO)
- `src/components/auth/email-signin.tsx` – přidán perzistentní cooldown přes `localStorage` a uživatelské hlášky místo console error (eliminuje spam při refreshi)
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `rateLimitExceeded`, `tryAgainIn`, `otpSendError`

### Krok 46 – Účty: Drag & Drop pořadí sítí + přidání YouTube a TikTok (DOKONČENO)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – ikony platforem jsou přetahovatelné přes Framer Motion `Reorder` (lokální `useState`), včetně jemného zvětšení + výraznějšího glow při drag; zároveň doplněny platformy YouTube a TikTok a labely jsou napojené na i18n
- `src/components/ui/social-icons.tsx` – přidány brand ikony `Youtube` a `TikTok` (inline SVG)
- `src/app/api/accounts/route.ts` – rozšířen allowlist platforem o `youtube` a `tiktok`
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny překlady `accounts.platforms.*` pro nové platformy (a sjednocení labelů v UI)

## 2026-05-02

### Krok 45 – Final UI Polish: Odstranění redundantních log a oprava prázdného stavu Účtů (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/app/[locale]/(dashboard)/templates/new/page.tsx` – odstraněno redundantní `<Logo />` z hlaviček stránek (logo zůstává pouze v sidebaru)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava logiky prázdného stavu: „Žádné propojené účty“ se nyní skrývá, pokud je aktivní formulář pro připojení platformy (`!selectedPlatform && accounts.length === 0`)
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – ověřeno vycentrovaný nadpis „Nová šablona“ nad glass kartou
- Sjednocení vzhledu vnitřních stránek dashboardu pro maximální čistotu rozhraní

### Krok 44 – Oprava i18n chyby MISSING_MESSAGE na stránce Účty (DOKONČENO)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněn chybějící klíč `accounts.connectAccount`, který používá `src/app/[locale]/(dashboard)/accounts/page.tsx`
- Fixuje runtime chybu: `MISSING_MESSAGE: Could not resolve accounts.connectAccount for locale cs`
- Pozn.: V Krok 42 bylo mylně uvedeno, že klíč už existuje v `cs.json`

### Krok 42 – Tuning formulářů: Glass kontejnery, Inputy, Tlačítka, Branding (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – kompletní redesign formuláře „Nový příspěvek":
  - **Glass kontejner**: `bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`
  - **Inputy/Textarea**: `bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30`
  - **Tlačítka**: Primární (Naplánovat, Publikovat) – `bg-gradient-to-br from-indigo-600 to-purple-600` + indigo glow shadow, sekundární (Koncept) – glass outline
  - **Platform pills**: Aktivní `bg-indigo-500/20 border-indigo-500/50 text-indigo-300`, neaktivní `bg-white/[0.03] border-white/5`
  - **Branding**: Logo v horním rohu, grid pattern na pozadí, indigo + purple záře v rozích
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – stejný redesign:
  - Glass kontejner, styled inputy/textarea, gradient tlačítko „Vytvořit", branding (Logo + grid + záře)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – redesign formuláře „Propojit účet":
  - Nahrazen `<Card>` → glass kontejner (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`)
  - Inputy: `bg-black/20 border-white/10 rounded-xl` s indigo focus ring
  - Tlačítko „Propojit účet": gradient + glow shadow
  - Branding: Logo v horním rohu, grid pattern, indigo + purple záře
  - I18N: Klíč `accounts.connectAccount` již existuje v `cs.json` („Propojit účet") – žádný nový klíč nutný
- `src/components/ui/logo.tsx` – importován do všech tří stránek pro brand konzistenci
- Build: úspěšný, žádné TypeScript chyby

### Krok 41 – Redesign stránky Příspěvky (Posts) – Prémiový vzhled (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní redesign vizuálu:
  - **Hlavička**: Subtitle "0 příspěvků" s jemnější barvou (`text-muted-foreground/60`) jako u Účtů
  - **Tlačítko "Nový příspěvek"**: Gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s indigo glow stínem (`shadow-[0_0_20px_rgba(99,102,241,0.3)]`), radius `rounded-[20px]`
  - **Filtry (Pills)**: Neaktivní `bg-white/[0.03] border-white/5`, aktivní `bg-white/10 border-white/20 text-white`, radius `rounded-full px-4 py-1.5 text-sm`
  - **Empty State**: Odstraněn šedý Card box, nahrazen vizuálním centrem – ikona `FileText` s fialovou září (`blur-3xl`), text `text-muted-foreground/60`, sekundární tlačítko v glass stylu (`bg-card/40 border-white/5 backdrop-blur-md`)
  - **Pozadí**: Glow efekty v rozích (indigo + purple) pro hloubku, grid pattern z layoutu
  - **PostCard**: Glassmorphism (`bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]`)
  - **Responsivita**: Hlavička flex-col na mobilu, MobileNav `pb-24` v layoutu zajišťuje že obsah není překryt

### Krok 40 – Oprava ikon sociálních sítí a TypeScript chyb (DOKONČENO)
- `src/components/ui/social-icons.tsx` – nová sdílená komponenta pro brand ikony (Instagram, Facebook, Twitter, LinkedIn):
  - Implementace jako inline SVG, protože `lucide-react` tyto brand loga neexportuje
  - Rozhraní `SocialIconProps` s podporou `className` pro konzistentní stylizaci
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava importů a TypeScript chyb:
  - Import ikon přesunut z `lucide-react` do `@/components/ui/social-icons`
  - Oprava chyby `ReactNode` při vykreslování komponent ikon (místo `{icon}` → `<Icon className="..." />`)
  - Oprava syntaxe IIFE v JSX pro kondicionální renderování modálu
- `src/app/[locale]/(auth)/onboarding/client.tsx` – úklid:
  - Odstraněny lokální inline SVG definice ikon
  - Import sdílených ikon z `@/components/ui/social-icons`

### Krok 39 – Prémiový dynamický favicon a Apple ikona (DOKONČENO)
- `src/app/icon.tsx` – implementován dynamický favicon (32x32) pomocí `next/og`:
  - Design: Vycentrované bold písmeno 'P' s brandovým gradientem (`linear-gradient(to bottom right, #4f46e5, #9333ea)`).
  - Pozadí: Průhledné pro moderní vzhled v prohlížeči.
- `src/app/apple-icon.tsx` – implementována ikona pro iOS (180x180):
  - Design: Písmeno 'P' s gradientem na čistě černém pozadí (#000) pro nativní vzhled aplikace na iPhone.
- Úklid: Odstraněn statický soubor `src/app/favicon.ico` pro prioritizaci dynamického generování.
- `src/app/layout.tsx` – ověření absence ručních `<link rel="icon">` tagů pro plnou kompatibilitu s Next.js App Router.

### Krok 38 – Sjednocení UI: Přesun odhlašení do Nastavení (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – odstraněn logout formulář a tlačítko z dolní části sidebaru pro čistší navigaci.
- `src/components/auth/logout-button.tsx` – vytvořena nová samostatná komponenta pro odhlášení:
  - Implementována logika `supabase.auth.signOut()` s následným redirectem na `/login`.
  - Stylizována jako "nebezpečná" akce (`hover:text-destructive`).
- `src/app/[locale]/(dashboard)/settings/page.tsx` – integrace `<LogoutButton />` do sekce "Nebezpečná zóna" (Danger Zone):
  - Tlačítko umístěno do interaktivního řádku s ikonou `ChevronRight` a efektem `hover:bg-destructive/5`.
  - Přidán padding `pb-32` k hlavnímu kontejneru stránky pro správné zobrazení na mobilu (nad spodním menu).
- `src/messages/cs.json`, `en.json`, `uk.json` – sjednocení a oprava překladového klíče `common.logout` napříč všemi jazyky.
- Oprava chyby `MISSING_MESSAGE` pomocí sjednocení namespace `common` (lowercase) v překladových souborech a komponentě.

### Krok 37 – Kompletní lokalizace (CZ, EN, UK) (DOKONČENO)
- `src/messages/uk.json` – doplnění chybějících překladů: klíč `logout` v sekci `common` a `title` v sekci `cookie`.
- `src/messages/cs.json` & `src/messages/en.json` – sjednocení překladů: přidán klíč `logout` do sekce `common` pro zajištění konzistence.
- `i18n.ts`, `middleware.ts` & `src/i18n/request.ts` – ověření správné konfigurace a podpory jazyka `uk` v celém i18n flow.
- `src/components/locale-switcher.tsx` – ověření viditelnosti a funkčnosti přepínače pro ukrajinštinu.

### Krok 36 – Finální vizuální polish dashboardu (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – integrace sjednocené `<Logo />` komponenty a vylepšení aktivního stavu položek menu (`bg-white/[0.03]`, `text-foreground`).
- `src/app/[locale]/(dashboard)/layout.tsx` – implementován background grid pattern a jemné, tušené barevné záře (glows) v rozích (`opacity-[0.03]`, `blur-[120px]`) pro větší hloubku pozadí.
- `src/app/[locale]/(dashboard)/page.tsx` – update typografie: nadpis zvětšen na `text-3xl` s `tracking-tight`, subtext nastaven na `text-muted-foreground/60`.
- `CLAUDE.md` & `AGENTS.md` – přidána sekce "Standard UI Postio" s definicí barevného schématu, radiusů (20px), efektů glassmorphismu a typografie.
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace `<Logo />` komponenty do mobilního headeru.

### Krok 35 – Redesign Dashboardu: Karty a Úklid sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` & `src/app/[locale]/(dashboard)/layout.tsx` – odstraněna duplicita položky "Nastavení" z hlavního menu; odkaz přesunut na ikonu ozubeného kolečka u profilu uživatele.
- `src/app/[locale]/(dashboard)/page.tsx` – update vizuální identity dashboardu:
  - Statistické karty: Implementován 'Premium Glass' styl (`bg-card/40 backdrop-blur-md`, `border-white/5`, `rounded-[20px]`), jemnější barva ikon.
  - Akční karta "Nový příspěvek": Dominantní gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem.
  - Ostatní akční karty: Sjednoceny do glass stylu s radiusy `rounded-[20px]`.
  - Upgrade Banner: Kompaktnější padding a posílený fialový glow efekt v pozadí.

### Krok 34 – Redesign karet na dashboardu (Vzhled) (DOKONČENO)
- `src/app/[locale]/(dashboard)/page.tsx` – update stylů karet pro prémiový vzhled:
  - Statistické karty: Implementován glassmorphism (`bg-card/40 backdrop-blur-md`, `border-white/5`), radius `rounded-[20px]`, zmenšeny ikony a hodnoty (`text-2xl`)
  - Akční karta "Nový příspěvek": Primární gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem pro maximální kontrast
  - Ostatní akční karty: Přepsány do stejného glass stylu jako statistické karty
- Vizuální sjednocení s mockupem přihlašovací stránky

### Krok 33 – Redesign Dashboardu (Sidebar a Layout) (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – nová komponenta Sidebaru:
  - Styl: Glassmorphism (`bg-card/50 backdrop-blur-md`), užší a elegantnější vzhled
  - Navigace: Implementován aktivní stav s barevným akcentem a zářícím indikátorem
  - Account Switcher: Přidána sekce v dolní části s údaji uživatele, tlačítkem Upgrade a nastavením
  - Branding: Integrace sjednocené `<Logo />` komponenty
- `src/app/[locale]/(dashboard)/layout.tsx` – aktualizace základní kostry:
  - Redukce vertikálního paddingu v headeru (`h-16` → `h-14`) pro lepší využití prostoru
  - Implementace `font-sans` (Inter/Geist) napříč layoutem
  - Radiusy: Sjednocení zaoblení na 20px (`--radius`) pro všechny kontejnery
- `src/lib/actions/auth.ts` – vytvoření Server Action pro odhlášení (`logoutAction`)
  - Řešení chyby serializace funkcí z Server do Client Componentu
- `src/app/layout.tsx` – oprava varování v konzoli u skriptu inicializace tématu (přidán `id="theme-init"`)

## 2026-05-01

### Krok 32 – Branding, i18n a Premium Dark styl pro Privacy stránku (DOKONČENO)
- `src/components/ui/logo.tsx` – nová sjednocená Logo komponenta:
  - Styl: Bold, `tracking-tighter`, primární barva pro 'P', foreground pro 'ostio'
- `src/messages/cs.json`, `en.json` – oprava i18n: přidán chybějící klíč `cookiesDesc` v namespace `privacy`
- `src/app/[locale]/privacy/page.tsx` – kompletní redesign na "Premium Dark" styl:
  - Pozadí: `bg-black`, font `font-sans` (Inter)
  - Layout: Centrování `max-w-3xl`, whitespace `py-12 lg:py-24`
  - Typografie: Nadpisy bílé, popisy `muted-foreground`, vylepšená čitelnost (leading-relaxed)
  - Logo: Integrace nové `Logo` komponenty v headeru
  - Tlačítko "Zpět": Redesign na `rounded-2xl` s jemným borderem a backdrop-blurem
- Ověření: Proběhl lint check, funkčnost i18n ověřena

### Krok 31 – Oprava mobilního zobrazení Login + Cookie Consent (DOKONČENO)


## 2026-04-28

### Krok 1 – Inicializace projektu (dokončeno dříve)
- Next.js 14 projekt s TypeScript, Tailwind, App Router
- Instalace: shadcn-ui, next-intl, @supabase/supabase-js, @supabase/ssr
- `.env.local` a `.env.example`
- `src/lib/supabase/client.ts` – browser klient

### Krok 2 – Supabase konfigurace (dokončeno dnes)
- `src/lib/supabase/server.ts` – server klient pro SSR (čte/žepíše cookies pro auth session)
- `src/lib/supabase/middleware.ts` – helper pro middleware (vrací `{ supabase, response }` pro refresh JWT tokenů)
- `supabase/migrations/001_initial_schema.sql` – 6 tabulek + RLS politiky + indexy
  - `users` – profil, plán (free/creator/pro), jazyk, streak, onboarded flag
  - `social_accounts` – platforma, jméno, access_token, is_active
  - `posts` – obsah, media_urls, platformy, status (draft/scheduled/published/failed)
  - `templates` – šablony příspěvků s premium flagem
  - `analytics` – impressions + engagements per post
  - `cookie_consents` – GDPR (necessary/analytics/marketing)
  - RLS: každý uživatel vidí/čte/mění pouze svá data (auth.uid() = user_id)
  - Analytics RLS přes EXISTS join na posts tabulku
  - Trigger: automatické updated_at na posts

### Krok 3 – i18n + middleware + layout struktura (dokončeno)
- `i18n.ts` – konfigurační soubor s locales (cs, en, uk)
- `src/i18n/request.ts` – next-intl request config pro Next.js 16
- `src/messages/cs.json`, `en.json`, `uk.json` – překladové soubory
- `middleware.ts` – kombinace Supabase auth refresh + next-intl routing
- `next.config.ts` – integrace next-intl plugin
- `src/app/layout.tsx` – root layout (minimal, bez fontů)
- `src/app/[locale]/layout.tsx` – locale layout s NextIntlClientProvider + ThemeProvider
- `src/app/[locale]/(auth)/layout.tsx` – layout pro auth stránky
- `src/app/[locale]/(dashboard)/layout.tsx` – dashboard layout se sidebar navigací
- `src/app/[locale]/(auth)/login/page.tsx` – login stránka s Google OAuth
- `src/components/auth/google-signin-button.tsx` – tlačítko Google přihlášení
- `src/app/auth/callback/route.ts` – auth callback route pro Supabase OAuth
- `src/app/[locale]/(dashboard)/page.tsx` – dashboard s statistikami a quick actions
- `src/components/providers/theme-provider.tsx` – light/dark mode provider
- `src/components/theme-toggle.tsx` – přepínač theme
- `src/components/locale-switcher.tsx` – přepínač jazyka
- `src/components/ui/card.tsx` – Card komponenta
- `src/components/ui/dropdown-menu.tsx` – DropdownMenu komponenta
- `.env.example` – šablona environment proměnných
- `globals.css` – primary barva změněna na indigo (#6366F1)
- Instalace: framer-motion, next-themes, @radix-ui/react-dropdown-menu
- Build úspěšný

### Krok 4 – Šablony + Analytics + Settings + Edit Post (dokončeno)
- `src/app/[locale]/(dashboard)/templates/page.tsx` – seznam šablon s delete/use
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – analytika (impressions, engagements, rate)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – nastavení profilu a plánu
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku
- `src/lib/supabase/types.ts` – TypeScript typy pro Database
- `supabase/migrations/002_auth_trigger.sql` – auto-create user řádky při signup

### Krok 5 – Oprava TypeScript chyb (dokončeno)
- Odstraněno `Database` generikum z `createServerClient`/`createBrowserClient` – `@supabase/ssr` ho špatně předával
- Opraveno pořadí query chain: `.select("*")` před `.order()`
- Přidány typové anotace na `.map()` callback parametry
- Přidány null checky na Supabase response data
- Import `SupabaseClient` přesunut z `@supabase/ssr` do `@supabase/supabase-js`
- Build úspěšný bez TypeScript chyb

## 2026-04-29

### Krok 6 – Zprovoznit localhost bez Supabase (DOKONČENO)
**Hotovo:**
- `src/app/page.tsx` – redirect `/` → `/cs/login` (fallback pro dev mode)
- Middleware config matcher aktualizován
- Production build: redirect funguje (307 `/` → `/cs/login`)
- `/cs/login` vrací 200 OK

**Opravy:**
1. **Middleware publicRoutes bug** – `startsWith("/login")` nešlo pro `/cs/login` cesty
   - Fix: změněno na `includes("/login")` → locale-prefixed routy fungují
2. **Dashboard nav link bug** – sidebar odkazoval na `/{locale}/dashboard` místo `/{locale}/`
   - Fix: změněno href na `/{locale}` (route group `(dashboard)` nevytváří URL segment)
3. Google sign-in button: už měl disabled logiku (`isSupabaseConfigured` check) ✓
4. Dashboard layout: try/catch + redirect na login bez session ✓

**Výsledek:**
- Production: všechny routy fungují perfektně
- Dev mode (Turbopack): routy fungují po inicializaci kompilace
- Test: `npm run build && npm run start` → otevřít `http://localhost:3000`

**Poznámka:** Všechny soubory už mají try/catch kolem Supabase volání z předchozí session.

### Krok 7 – Supabase propojení + oprava auth callback (DOKONČENO)
**Hotovo:**
- `.env.local` – vyplněné SUPABASE_URL + ANON_KEY + SERVICE_ROLE_KEY
- `src/app/auth/callback/route.ts` – opravený OAuth callback flow
  - Dynamické čtení locale z referer header
  - Správné předávání cookies pro session
  - Redirect na dashboard po úspěšném loginu
- `.env.example` – vyčištěno (GOOGLE_CLIENT_ID/SECRET/NEXTAUTH_SECRET se nepoužívají – Supabase řeší OAuth server-side)
- Google OAuth přihlášení funkční: Login → Supabase OAuth → Callback → Dashboard
- Middleware auth check funkční – redirect na login bez session, cookies správně předávány

### Krok 8 – Social account connect API + Seed data + Cookie consent fix (DOKONČENO)
**Hotovo:**
- `src/app/api/accounts/route.ts` – POST endpoint pro uložení social account
  - Auth check (session required), validace platformy, insert do DB
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – přepracováno na "use client"
  - Klik na platformu otevře formulář (account name + access token)
  - POST na `/api/accounts` → refresh seznam účtů
  - Disconnect tlačítko (is_active = false)
- `supabase/migrations/003_seed_templates.sql` – výchozí šablony pro nové uživatele
  - Rozšířený trigger `handle_new_user()` – 6 šablon + cookie consent záznam
  - UNIQUE index na `cookie_consents.user_id` pro upsert
- `src/components/cookie-consent.tsx` – oprava (odstraněn nepoužitý import `useTranslations("common")`)
- Překlady cs/en/uk – přidány klíče: `accessToken`, `accessTokenPlaceholder`, `connecting`, `errorConnecting`, `cancel`

**Poznámka:** Migrace `003_seed_templates.sql` – nahraj ručně přes Supabase Dashboard → SQL Editor (Supabase CLI není nainstalovaná)

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 9 – Onboarding flow (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/onboarding/page.tsx` – server component s auth checkem
- `src/app/[locale]/(auth)/onboarding/client.tsx` – 3-krokový onboarding wizard
  - Krok 1: Připojení social account (Instagram, Facebook, Twitter/X, LinkedIn)
  - Krok 2: Profil setup (jméno + zájmové kategorie)
  - Krok 3: Hotovo → redirect na dashboard
- Onboarding přesunut z `(dashboard)` do `(auth)` route group – žádné redirect loopy
- Dashboard layout (`(dashboard)/layout.tsx`) – redirect ne-onboardovaných uživatelů na `/onboarding`
- Social ikony (Instagram, Facebook, LinkedIn) – inline SVG (lucide-react je nemá)
- `src/app/api/onboarding/route.ts` – PATCH endpoint pro uložení profilu + onboarded=true
- Prázdný adresář `(dashboard)/onboarding/` vyčištěn
- Build úspěšný

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 10 – Oprava React 19 warningu (next-themes) (DOKONČENO)
**Hotovo:**
- `src/components/providers/theme-provider.tsx` – vlastní implementace bez `<script>` tagů
  - Čte/žepíše cookie `theme`, podporuje system preference listener
  - Plně kompatibilní s React 19 (žádné console warningy)
- `src/components/theme-toggle.tsx` – přepíná na `ThemeContext` z vlastního providera
- `next-themes` package odstraněn z `package.json`
- Console error pryč

### Krok 11 – Oprava přepínače jazyků (DOKONČENO)
**Hotovo:**
- `src/i18n/request.ts` – opravena validace locale + typy (requestLocale může být Promise)
- `cs.json` / `en.json` – prohozen obsah (byly zaměněné – cs měl en text a naopak)
- `uk.json` – správně
- `src/components/locale-switcher.tsx` – opraveno `router.push()` → `window.location.href`
  - Důvod: next-intl načítá překlady server-side přes `getMessages()`. Client-side navigace nereenderuje layout s novými překlady.
- `src/app/[locale]/(dashboard)/settings/page.tsx` – odstraněn hard-coded český text
  - Přidány i18n klíče: `saved`, `currentPlan`, `dangerZone`, `dangerZoneDesc`, `deleteAccount`
  - Plán ceny: ceny dynamické z `PLAN_PRICES` map + `common.free` klíč
  - Všechny 3 jazyky aktualizovány
- Build úspěšný

### Krok 12 – Oprava Supabase bezpečnostního warningu (DOKONČENO)
**Hotovo:**
- Všechna volání `getSession()` → `getUser()` v 5 souborech:
  - `src/app/api/accounts/route.ts`
  - `src/app/api/onboarding/route.ts`
  - `src/app/[locale]/(auth)/onboarding/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `getUser()` ověřuje session proti Supabase Auth serveru (bezpečnější než `getSession()` z cookies)
- Console warning pryč

### Krok 13 – Oprava settings page + dev mode fallback (DOKONČENO)
**Hotovo:**
- `middleware.ts` – přidán check `isSupabaseConfigured` + `supabaseError` flag
  - Bez auth session: redirect na login (když Supabase je configured)
  - Když Supabase není configured nebo throwne error: přístup bez auth (dev mode)
- `(dashboard)/layout.tsx` – opraven auth check s `supabaseAvailable` flag
  - Když Supabase throwne error: přístup bez redirectu na login
  - Onboarding check pouze pokud existuje session
- `settings/page.tsx` – přidán try/catch + dev mode indikátor
  - Bez session: ukazuje "Demo uživatel" + warning banner
  - S session: normální funkčnost s databází

**Poznámka:** Settings stránka vyžaduje přihlášení přes Google OAuth pro plnou funkčnost.
- curl test: 307 redirect na /login (bez auth cookies) – správné chování
- V browseru s přihlášením: settings funguje plně

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel
- [ ] Test settings page s přihlášeným uživatelem v browseru

## 2026-04-30

### Krok 14 – Oprava přepínání jazyků (DOKONČENO)
**Problém:** Aplikace renderovala vždy české překlady bez ohledu na URL (`/en/*`, `/uk/*`).

**Příčina:** Server-side překlady (`getMessages()` / `getTranslations()`) spoléhaly na `requestLocale`, které v tomto setupu nebylo spolehlivě dostupné → fallback na `cs`.

**Hotovo:**
- `src/app/[locale]/layout.tsx` – `getMessages({ locale })` (locale z route params)
- Server stránky/layouty – `getTranslations({ locale, namespace })` místo `getTranslations(namespace)`
  - `src/app/[locale]/(auth)/login/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/app/[locale]/(dashboard)/templates/page.tsx`
  - `src/app/[locale]/(dashboard)/analytics/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `src/components/locale-switcher.tsx` – opraveno zachování query stringu (přidán `?`)

**Výsledek:** Přepínání `cs/en/uk` funguje, překlady odpovídají aktivnímu locale v URL.

### Krok 15 – Oprava problikávání tmavého režimu (DOKONČENO)
**Problém:** Při navigaci mezi stránkami v tmavém režimu problikával světlý režim a zpomaloval aplikaci.
**Příčina:** Při `theme=system` server neměl informaci o `prefers-color-scheme`, proto rendroval light a až po hydrataci se přepnul na dark.
**Řešení:**
- `src/app/layout.tsx` – early-init script v `<head>` nastaví `dark/light` ještě před prvním paintem (cookie `theme` + `matchMedia`)
- `src/app/layout.tsx` – server-side nastaví `<html class="dark">` pokud cookie je `theme=dark`
- `suppressHydrationWarning` na `<html>` a `<body>` – potlačuje hydration warning (theme se liší server vs client)
- Theme provider na client-side již jen udržuje stav a reaguje na změny

### Krok 16 – Oprava přepínače jazyka v Nastavení (DOKONČENO)
**Problém:** Select „Profil → Jazyk“ na stránce Nastavení měnil jen hodnotu ve formuláři/DB, ale nepřepínal jazyk UI.

**Řešení:**
- `src/app/[locale]/(dashboard)/settings/page.tsx` – jazyk UI se přepne až po potvrzení tlačítkem „Uložit“
  - select pouze změní lokální stav
  - po úspěšném uložení profilu (nebo v dev mode) proběhne hard navigace na stejnou stránku s novým locale v URL (`/cs|en|uk/...`) včetně zachování query stringu

### Krok 17 – Dev server: 404 na některých routách (WSL/Turbopack) (DOKONČENO)
**Problém:** V dev módu se objevovaly 404 pro některé stránky (`/cs/posts`, `/cs/templates`, `/cs/settings`), i když `next build` tyto routy generuje správně.

**Řešení:**
- `package.json` – `npm run dev` nyní spouští webpack dev server (`next dev --webpack`)
- Přidán script `dev:turbo` pro spuštění Turbopacku explicitně (pokud je potřeba)

### Krok 18 – Mobile responsive dashboard layout (DOKONČENO)
**Problém:** Dashboard nefungoval správně na mobilních zařízeních – hamburger menu bez overlay/ESC, filters přetekly, tituly se nevešly.

**Hotovo:**
- `src/components/mobile-nav.tsx` – nový client component pro mobilní navigaci
  - Otevření/zavření přes `useState` (žádný checkbox hack)
  - Overlay backdrop – kliknutí mimo zavře menu
  - Klávesa `Escape` zavře menu
  - Automatické zavření po navigaci (`useEffect` na `pathname`)
  - Logout přes browser Supabase klient
- `src/app/[locale]/(dashboard)/layout.tsx` – integrovan MobileNav
  - Desktop sidebar (`md:flex`) + mobilní hamburger (`md:hidden`)
  - Padding `p-4 md:p-6` pro menší okraje na mobilu
- Všechny dashboard stránky – responsive hlavičky:
  - `text-2xl sm:text-3xl` na všechny `<h1>` tituly
  - Header s tlačítkem: `flex-col sm:flex-row` (pod sebou → vedle sebe)
  - Tlačítka: `w-full sm:w-auto` (plná šířka na mobilu)
  - Filters na posts: `flex-wrap` (omíjení na více řádků)
- Build úspěšný

### Krok 19 – Pricing comparison karta na dashboardu (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(dashboard)/page.tsx` – přidána `PricingCard` komponenta
  - Tabulka srovnání plánů: Free / Creator / Pro
  - Sloupce: cena (Kč, EUR, USD), limity funkcí
  - Řádky: Sociální účty, Příspěvky/měsíc, Šablony, Analytika, Prioritní podpora
  - Checkmark (✓) / dash (—) indikátory dostupnosti funkcí
  - Badge aktuálního plánu uživatele (z DB)
  - Tlačítko „Upgrade" → redirect na Nastavení
  - Překlady předávány jako props z server-side `getTranslations()`
- Překlady (cs/en/uk) – nové klíče v `dashboard` namespace:
  `upgradeTitle`, `upgradeSubtitle`, `currentPlan`, `socialAccounts`,
  `postsPerMonth`, `templates`, `analytics`, `prioritySupport`,
  `unlimited`, `upgrade`, `downgrade`, `perMonth`
- Build úspěšný

### Krok 20 – Fix: 500 na dashboardu v dev mode (RSC serializace ikon) (DOKONČENO)
**Problém:** `MobileNav` (client component) dostával z `(dashboard)/layout.tsx` `navItems` včetně Lucide ikon (React komponenty), které nelze předávat přes Server→Client props → 500 na `/cs`.

**Řešení:**
- `src/components/mobile-nav.tsx` – `navItems.icon` změněn na string key + lokální mapování ikon
- `src/app/[locale]/(dashboard)/layout.tsx` – pro mobil se předává `mobileNavItems` s plain hodnotami
- Build úspěšný

### Krok 21 – Šablony: tlačítko „Nová šablona“ + create stránka (DOKONČENO)
**Problém:** Na stránce Šablony klik na „Nová šablona“ nic neudělal (tlačítko bez navigace/handleru v server komponentě).

**Hotovo:**
- `src/app/[locale]/(dashboard)/templates/page.tsx` – tlačítko změněno na link `/${locale}/templates/new`
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – nový formulář pro vytvoření šablony (name + content)
- `src/lib/actions/templates.ts` – server action `createTemplate()` (insert do Supabase + revalidate `/templates`)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro formulář (`namePlaceholder`, `content`, `contentPlaceholder`, `errorSaving`)

### Krok 22 – UI/UX refresh (dark SaaS) – login + dashboard (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – moderní gradient background pro auth (jemné glow blob efekty)
- `src/app/[locale]/(auth)/login/page.tsx` – premium karta (rounded-2xl, jemný border, shadow, backdrop blur) + nadpis Postio s text gradientem
- `src/components/auth/google-signin-button.tsx` – Google tlačítko ve „white“ stylu (vyšší důvěryhodnost)
- `src/app/[locale]/(dashboard)/page.tsx`
  - stat karty: čísla zvětšena na `text-4xl font-bold`
  - quick actions: „Nový příspěvek“ jako primární CTA (nejvýraznější), ostatní větší + výraznější hover
  - pricing tabulka odstraněna, nahrazena elegantním Pro CTA bannerem
- `src/messages/cs.json`, `en.json`, `uk.json` – nové dashboard klíče pro CTA banner (`proCtaTitle`, `proCtaSubtitle`, `proCtaButton`)

### Krok 23 – Konzistentní dark mode napříč celou aplikací (DOKONČENO)
**Problém:** Auth stránky (login, onboarding) měly hard-coded barvy (`border-white/10`, `from-white`, `bg-indigo-500`) které špatně fungovaly v light mode a lišily se od dashboardu.

**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – glow efekty: `bg-primary/5` (light) / `dark:bg-primary/10` (dark), odstraněn `bg-indigo-500`
- `src/app/[locale]/(auth)/login/page.tsx` – karta: `border` místo `border-white/10`, `bg-card` místo `bg-card/80`, gradient: `from-foreground` místo `from-white`
- `src/app/[locale]/(dashboard)/page.tsx` – UpgradeBanner: `border` místo `border-white/10`, glow efekty s `dark:` variantami, odstraněn `bg-indigo-500`
- Všechny barvy nyní přes CSS proměnné (`--card`, `--foreground`, `--primary`, `--border`) – stejný vzhled v light i dark mode

### Krok 24 – Light mode redesign (šedé pozadí + bílé karty) (DOKONČENO)
**Hotovo:**
- `src/app/globals.css` – `:root` proměnné upraveny pro styl dashboardu:
  - `--background: oklch(0.967 0 0)` – světle šedé pozadí místo bílé
  - `--ring: oklch(0.55 0.25 275)` – focus ring v primary barvě místo šedé
  - `--sidebar: oklch(1 0 0)` – sidebar bílý
  - `--sidebar-primary: oklch(0.55 0.25 275)` – sidebar primary v purple
- `src/components/ui/card.tsx` – karty s `rounded-xl` + `shadow-md` (light) / `shadow-sm` (dark)
- `src/app/[locale]/(dashboard)/layout.tsx` – header + sidebar mají `shadow-sm dark:shadow-none`, main content `bg-background`
- Světlý režim nyní odpovídá referenčnímu designu: šedé pozadí, bílé karty s jemnými stíny

### Krok 25 – Deploy na Vercel (DOKONČENO)
**Hotovo:**
- Aplikace nasazena na Vercel (free tier)
- Environment variables nakonfigurovány: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- GitHub repozitář propojen s Vercel projektem pro automatické deploye
- Production build úspěšný, aplikace dostupná na Vercel URL

### Krok 26 – Oprava odkazu "Zjistit více" v cookie banneru (DOKONČENO)
**Problém:** Tlačítko „Zjistit více" v cookie consent banneru bylo obyčejný `<button>` bez `onClick` handleru – kliknutí nic nedělalo.

**Hotovo:**
- `src/app/[locale]/privacy/page.tsx` – nová veřejná stránka Ochrany osobních údajů (mimo auth guard)
  - Sekce: data která sbíráme, jak je používáme, cookies, sdílení dat, práva, kontakt
  - Plně lokalizovaná (cs/en/uk) přes `getTranslations()`
- `src/components/cookie-consent.tsx` – `<button>` → `<Link>` na `/{locale}/privacy`
  - Dynamické locale z `usePathname()`
- `src/messages/cs.json`, `en.json`, `uk.json` – nový namespace `privacy` (14 klíčů)

**Následující kroky:**
- [ ] Social accounts – skutečné OAuth integrace (Instagram, Facebook, Twitter, LinkedIn)
- [ ] Posts – CRUD operace s databází (create, schedule, publish)
- [ ] Analytics – reálná data z API sociálních sítí
- [ ] Payment integrace (Stripe) pro Creator/Pro plány
- [ ] Email notifikace (Resend)


### Krok 30 – Majestátní pravý panel na login stránce (DOKONČENO)
**Hotovo:**
- `src/components/auth/login-visual.tsx` – dashboard mock zvětšen o 25 % (`scale-125` místo `scale-110`)
  - Grid pattern v pozadí zesílen na opacitu 8 % (z 2,5 %) pro jemnější viditelnost
  - Přidán silný měkký glow efekt za dashboard: `blur-[100px]`, gradient purple→indigo→blue (30/20/10 %)
  – Glow je centrován (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`) s `z-[5]` a `pointer-events-none`

### Krok 27 – Login page redesign (DOKONČENO)

### Krok 28 – Responzivní auth layout + redesign vizuálního panelu (DOKONČENO)

### Krok 29 – Oprava pozice LocaleSwitcheru na login stránce (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/login/page.tsx` – odstraněn obalový `<div>` kolem `<LocaleSwitcher />`
  - Třídy pro pozicování (`absolute top-8 right-8 z-50`) přeneseny přímo na komponentu
  - Levý panel už má třídu `relative`, takže absolutní pozicování funguje správně
**Hotovo:**
- `src/app/globals.css` – tmavý gradient na pozadí, `--radius: 20px`, touch targety 48px na mobilu
- `src/app/[locale]/(auth)/layout.tsx` – wrapper bez `bg-background`
- `src/app/[locale]/(auth)/login/page.tsx` – Layout 40/60 přesné šířky (`w-[40%]` / `w-[60%]`)
  - LocaleSwitcher: absolutně v pravém horním rohu levého panelu (`absolute right-8 top-8`, padding 2rem)
  - Nadpis „P‍ostio" zvětšen na `text-5xl` / `sm:text-6xl`
  - „Začněte s Postio" zvětšen na `text-3xl` / `sm:text-4xl`
  - LoginVisual skryt `hidden lg:flex` – na mobilu se nevykresluje vůbec
- `src/components/auth/login-visual.tsx` – kompletní redesign:
  - Dashboard mock zvětšen ~30 % (padding `p-8`, bar chart `h-32`, čísla `text-xl`/`text-2xl`)
  - Pozadí: grid pattern (opacita 4 %) + fialová/modrá glow bloby (`blur-3xl`)
  - Všechny texty lokalizované přes props: Dashboard, This week, Posts, Reach, Eng., Post scheduled, +24%
- `src/components/auth/google-signin-button.tsx` – `rounded-2xl`, `h-12`, hover efekt `hover:-translate-y-0.5` + `hover:shadow-medium`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `visualDashboard`, `visualThisWeek`, `visualPosts`, `visualReach`, `visualEngagement`, `visualScheduled`, `visualEngagementUp`

### Krok 27 – Login page redesign (DOKONČENO)
**Hotovo:**
- `src/app/layout.tsx` – přidán **Inter** font přes `next/font/google` (variable `--font-sans`, `display: swap`)
- `src/app/globals.css` – vylepšený design systém:
  - `--font-sans` s fallback na `system-ui, sans-serif`
  - `--radius: 1rem` (16px, zvětšeno z 10px)
  - `--shadow-soft`, `--shadow-medium`, `--shadow-card` – nové shadow utility
  - `--gradient-hero`, `--gradient-subtle` – brand gradienty
  - Primary barva jemně upravena `oklch(0.56 0.22 275)` pro lepší kontrast
  - Light mode: `--background: oklch(0.985 0 0)` (čistější bílo-šedá)
- `src/app/[locale]/(auth)/layout.tsx` – čistý gradient background (`from-primary/[0.03]`)
- `src/app/[locale]/(auth)/login/page.tsx` – **split layout redesign**:
  - Levý panel: logo "P"ostio (primary P), heading, subtext, Google sign-in, privacy link
  - Pravý panel: `LoginVisual` komponenta s gradient hero + dashboard mock
  - Responsive: pravý panel hidden na mobile (`hidden sm:flex w-1/2`)
- `src/components/auth/login-visual.tsx` – nová komponenta:
  - Gradient hero background (purple → violet → pink)
  - Dashboard mock karta s animovanými stat bary (Framer Motion)
  - Floating karty: "Post scheduled" + "+24% engagement"
  - Jemný cross pattern overlay
- `src/components/auth/google-signin-button.tsx` – vylepšený styl:
  - `h-11 rounded-xl` vyšší tlačítko, větší border radius
  - `shadow-card` stín, dark mode podpora (`dark:bg-gray-900`)
  - `space-y-4` místo `space-y-3` pro lepší spacing

### Krok 29 – Cookie Consent redesign + Framer Motion typy (DOKONČENO)
**Hotovo:**
- `src/components/cookie-consent.tsx` – kompletní přepsání:
  - **Floating card** místo bottom baru: `fixed bottom-4 right-4`, `rounded-2xl`, `bg-card`, border + stín
  - Tlačítka: "Předvolby" (outline) + "Přijmout vše" (primary, flex-1)
  - **Dialog (Modal)** pro předvolby cookies se 3 kategoriemi:
    - Nezbytné (vždy ON, bez switch, badge `bg-primary/10`)
    - Analytika (Switch ON/OFF + label stavu)
    - Marketing (Switch ON/OFF + label stavu)
  - Každá kategorie v `rounded-xl border p-4` kartě s popisem
  - Tlačítko "Uložit předvolby" v patě dialogu
  - Install: `@radix-ui/react-dialog` + shadcn `dialog` + `switch` komponenty
- `src/messages/cs.json`, `en.json`, `uk.json` – nové cookie klíče:
  `preferences`, `preferencesTitle`, `preferencesIntro`, `necessary`, `necessaryDesc`,
  `analyticsDesc`, `marketingDesc`, `savePreferences`, `on`, `off`
- `src/components/auth/login-visual.tsx` – oprava Framer Motion v12 typů:
  - `ease: "easeInOut"` → `ease: "easeInOut" as const` (3 místa)
  - Bez `as const` hlásí TypeScript chybu při buildu (infernovaný `string` není kompatibilní s `Easing`)
- Build úspěšný

### Krok 31 – Scheduler: Edge Function + Vercel Cron + ECC Service Role auth (DOKONČENO)
**Hotovo:**
- `supabase/functions/process-scheduled-posts/index.ts` – Edge Function, která zpracuje `posts` se statusem `scheduled` a `scheduled_at <= now()`, přepne je na `published` a založí výchozí řádek v `analytics`
  - Autorizace přes `Authorization: Bearer` ověřená jako JWT s rolí `service_role` přes Supabase JWKS (ECC klíče)
- `src/app/api/cron/process-scheduled-posts/route.ts` – Next.js API endpoint pro Vercel Cron, který volá Supabase Edge Function a předává `SUPABASE_SERVICE_ROLE_KEY` v hlavičce
- `vercel.json` – Cron definice `* * * * *` pro `/api/cron/process-scheduled-posts`
 - Pozn.: Supabase CLI nepovoluje secrets s prefixem `SUPABASE_`, proto Edge Function čte DB klíč z `POSTIO_SERVICE_ROLE_KEY`
