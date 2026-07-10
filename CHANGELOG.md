# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🎨 Feat — Sjednocení pozadí login page s Hero sekcí (Prompt 026, Krok 1)

- **Kontext**: Login page měla vlastní SVG grid pattern bez glow orbů, zatímco marketing layout používal CSS linear-gradient grid + centrální indigo glow. Vizuálně tak působila odtrženě od zbytku brandu.
- **Změny**:
  1. `src/app/[locale]/(auth)/login/page.tsx`: nahrazeno `bg-slate-200/50` + SVG grid za identický základ jako `(marketing)/layout.tsx` — 24x24 CSS gradient grid (šedý v light, bílý v dark) + indigo glow orb `bg-indigo-500/20 blur-[160px]` (light) / `bg-indigo-500/35` (dark). Přidáno `overflow-hidden` na root div. Oba panely dostaly `relative z-10` pro korektní stacking nad fixed pozadím.
- **Ověření**: `npx tsc --noEmit` ✅, vizuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/app/[locale]/(auth)/login/page.tsx`, `ukol.md` (Krok 1 ✅).


### 🌐 Feat — Dokončení lokalizace Landing Page + server locale fix (Prompt 021, Krok 5)

- **Kontext**: Landing page byla přeložená jen částečně. Client části (např. navigace / preview) se přepínaly správně, ale server-renderované sekce Hero, Ceník a FAQ v `en`/`uk` zůstávaly v češtině, protože používaly `getTranslations("landing")` bez explicitního `locale`.
- **Změny**:
  1. `src/app/[locale]/(marketing)/page.tsx`: locale se nově bere přímo z route params a `getTranslations` se volá jako `getTranslations({ locale, namespace: "landing" })`.
  2. `src/components/marketing/pricing-section.tsx` + `src/components/marketing/faq-section.tsx`: odstraněno implicitní čtení locale; obě server komponenty přijímají `locale` z parentu a používají explicitní `getTranslations({ locale, namespace: "landing" })`.
  3. `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` + `src/components/marketing/marketing-nav.tsx`: doplněny/učesány zbývající texty v `landing` namespace, včetně mobile-menu aria labelů a finálního EN/UK copy.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint src/app/[locale]/(marketing)/page.tsx src/components/marketing/pricing-section.tsx src/components/marketing/faq-section.tsx` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil, že vše je v pořádku).
- **Upravené soubory**: `src/app/[locale]/(marketing)/page.tsx`, `src/components/marketing/pricing-section.tsx`, `src/components/marketing/faq-section.tsx`, `src/components/marketing/marketing-nav.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md`.

### 🔧 Fix — Hero dashboard preview: responzivní, odlišná od Login vizuálu (Prompt 021-FIX)

- **Kontext**: Oprava Promptu 021-FIX. V Hero sekci landing page byla `<LoginVisual />`, která měla dva problémy: (1) byla uříznutá vpravo – původní příčinou byl `scale-125` (forced 125% šířky) + `max-w` s `overflow-hidden` kontejnerem, takže "REACH", "+24% engagement" a "Dashboard" byly mimo viditelnou oblast; (2) byla 1:1 identická s Login vizuálem (líné, repetitivní).
- **Změny**:
  1. `src/components/marketing/hero-dashboard-preview.tsx` (nový): odvozená varianta `LoginVisual`, NE kopie 1:1. Zachovává styl (adaptivní karta, fialové gradienty, sloupcový graf, "128 Posts" / "12.4K Reach" / "4.2% Eng."). Odlišení: jiná "scéna" – pod dashboardem **Scheduled queue** s platform chipy (IG/FB/LinkedIn/X) místo bubliny "Post scheduled". Plně responzivní: `w-full`, žádná fixed px šířka, žádný `scale` transform; `overflow-hidden` je jen na samotné kartě (neřeže vlastní obsah). Glow bloby adaptivní (light jemnější, dark silnější).
  2. `src/app/[locale]/(marketing)/page.tsx` (úprava Hero): `<LoginVisual />` → `<HeroDashboardPreview />`. Wrapper karty má `overflow-visible`; `<section>` má `overflow-hidden` jen proto, aby glow orby zůstaly uvnitř Hero (žádný horizontální scroll). Glow za kartou (`-inset-6`, `blur-3xl`) záměrně přesahuje uvnitř sekce.
- **Ověření**: `npx tsc --noEmit` ✅ (EXIT 0). Vizuální screenshot v Dark/Light v sandboxu NELZE (síť k browser-CDN blokovaná) – k finálnímu oku uživatele.
- **Upravené soubory**: `src/components/marketing/hero-dashboard-preview.tsx` (nový), `src/app/[locale]/(marketing)/page.tsx`.

### 🌐 Doplnění (i18n) – lokalizace HeroDashboardPreview (návaznost na 021-FIX)

- **Kontext**: Texty v `<HeroDashboardPreview />` byly natvrdo v angličtině ("Dashboard", "This week", "Scheduled queue", "Posts", "Reach", "Eng."). Aplikace má lokalizaci cs/en/uk.
- **Změny**:
  1. `src/messages/{cs,en,uk}.json`: nový namespace `landing.heroPreview` s klíči `dashboard`, `thisWeek`, `scheduledQueue`, `posts`, `reach`, `eng` pro všechny 3 jazyky (cs: Přehled/Tento týden/Naplánovaná fronta/Příspěvky/Dosah/Zap.; uk: Панель/Цей тиждень/Запланована черга/Дописи/Охоплення/Залуч.). Shoda klíčů napříč jazyky ověřena.
  2. `src/components/marketing/hero-dashboard-preview.tsx`: `useTranslations("landing.heroPreview")` (client) místo hardcodu; CSS `uppercase` třídy zajišťují zobrazení velkými písmeny.
- **Ověření**: JSON validita cs/en/uk ✅; shoda klíčů `landing.heroPreview` ✅; `npx tsc --noEmit` ✅ (EXIT 0); žádné natvrdo psané renderované stringy v komponentě. `NextIntlClientProvider` (přes `getMessages()` v `LocaleLayout`, který marketing dědí) dodá messages i client komponentě → žádné `MISSING_MESSAGE`.
- **Upravené soubory**: `src/components/marketing/hero-dashboard-preview.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### ✨ Feat — Marketing Layout: plovoucí glass nav (Prompt 021, Krok 2)

- **Kontext**: Krok 2 úkolu Prompt 021 (Marketingové stránky). Veřejná Landing potřebuje vlastní navigaci oddělenou od dashboardu: plovoucí glass pill s brandem, odkazy, přepínači jazyka/téma a CTA na login.
- **Změny**:
  1. `src/app/[locale]/(marketing)/layout.tsx` (nový): Server Component dědící `LocaleLayout` (NextIntl + ThemeProvider + CookieConsent). Aplikuje Geist jako brand font celé marketing sekce. Pozadí dle Theme Lock: pure black + 24x24 grid (opacity 0.04) + indigo záře (blur 160px), shodné s loginem/dashboardem.
  2. `src/components/marketing/marketing-nav.tsx` (nový, client): plovoucí glass pill (`fixed top-6`, `rounded-full`, `backdrop-blur-xl`, `h-16` = 64px, single-line) s Logo, odkazy Funkce/Ceník/FAQ (anchory `#funkce`/`#cenik`/`#faq`, cíle vzniknou v Krocích 3-4), LocaleSwitcher, ThemeToggle a CTA "Přihlásit se" -> `/${locale}/login` (indigo `#6366F1` s button-in-button šipkou). Mobil: hamburger -> full-screen glass overlay s prokládaným (staggered) zjevem; zavření Esc/clickem, lock scrollování.
  3. `geist` nainstalován (brand font marketing sekce; Inter je v manuálech banned, CLAUDE.md povoluje Geist).
  4. `messages/cs.json`/`en.json`/`uk.json`: nový namespace `landing.nav` (features/pricing/faq/login) pro lokalizované popisky navigu.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` ✅. Manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/app/[locale]/(marketing)/layout.tsx`, `src/components/marketing/marketing-nav.tsx`, `src/messages/cs.json`/`en.json`/`uk.json`, `package.json` (geist), `ukol.md` (Krok 2 ✅)

### 🔧 Feat — Routing: veřejná Landing Page na domovské URL (Prompt 021, Krok 1)

- **Kontext**: Krok 1 úkolu Prompt 021 (Marketingové stránky). Doposud `/` (resp. `/cs`) byl dashboard a nepřihlášené okamžitě přesměrovával na login. Cíl: neregistrovaný uživatel vidí veřejnou Landing page; na login jde jen při vstupu do chráněné `(dashboard)` sekce.
- **Změny**:
  1. `middleware.ts`: `/` už není v `isDashboardRoute` (je veřejná). Přidáno `startsWith("/dashboard")` mezi chráněné route. Přihlášený na `/` → `redirect` na `/cs/dashboard`.
  2. Přesun domovské stránky dashboardu: `(dashboard)/page.tsx` → `(dashboard)/dashboard/page.tsx` (URL `/cs/dashboard`); oprava relativního importu `./posts/normalize-post` → `../posts/normalize-post`.
  3. `(dashboard)/layout.tsx` + `mobile-nav.tsx`: odkaz "Dashboard" → `/cs/dashboard`.
  4. Post-login/OAuth redirecty (`auth.ts`, `auth/callback/route.ts`, `onboarding/client.tsx`, `verify-2fa/actions.ts`) → `/cs/dashboard` (ne na Landing).
  5. `src/app/page.tsx`: oprava `redirect("/cs/login")` → `redirect("/cs")` (root nesmí posílat na login).
  6. Vytvořen `(marketing)/page.tsx` – placeholder veřejné Landing (skutečný obsah v Krocích 2–3).
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil — odhlášený zůstává na `/`, přihlášený jde na `/cs/dashboard`).
- **Upravené soubory**: `middleware.ts`, `src/app/page.tsx`, `src/app/[locale]/(dashboard)/layout.tsx`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/mobile-nav.tsx`, `src/lib/actions/auth.ts`, `src/app/auth/callback/route.ts`, `src/app/[locale]/(auth)/onboarding/client.tsx`, `src/app/[locale]/(auth)/login/verify-2fa/actions.ts`, `src/app/[locale]/(marketing)/page.tsx`, `ukol.md` (Krok 1 ✅)

### ✨ Feat — Informativní toast při 0 Facebook Pages po OAuth (Prompt 025, Krok 7)

- **Kontext**: Krok 7 úkolu Prompt 025 – po návratu z Facebook OAuth (`?fb=connected`) se při nulovém počtu spravovatelných stránek query parametr jen tiše mazal, takže uživatel nedostal žádnou zpětnou vazbu.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. Effect pro `?fb=connected` čeká na dokončení načtení pending Pages i připojených účtů, aby nevyhodnotil stav předčasně.
  2. Pokud po načtení neexistují žádné pending Facebook Pages ani nově připojený Facebook/Instagram účet, zobrazí `toast.info(t("noPagesFound"))`.
  3. Pokud OAuth připojil aspoň Facebook nebo Instagram účet, parametr se dál jen uklidí bez toastu, aby se nezobrazovala zavádějící hláška.
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil, že krok 7 je hotový a zkontrolovaný).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 7 ✅)

### 🔧 Fix — Idempotentní POST /api/accounts (žádné duplicity u ručního připojení)

- **Kontext**: Návaznost na Krok 6 (Prompt 025). `POST /api/accounts` používal prostý `.insert()` bez `platform_id`/onConflict → při opakovaném ručním připojení (onboarding) vznikal druhý řádek. Endpoint není mrtvý – volá ho `onboarding/client.tsx` (krok 1 „připoj účet"), takže jej nelze jen zlikvidovat.
- **Změna** (`src/app/api/accounts/route.ts`):
  1. Před zápisem se zkontroluje existence ručního záznamu (`user_id, platform, platform_id IS NULL`); pokud existuje, `update`, jinak `insert` → idempotentní připojení bez duplicit.
  2. Reconnect existujícího ručního účtu povolen i na limitu plánu (nový účet blokován až po vyčerpání kapacity).
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/app/api/accounts/route.ts`.

### ✨ Feat — Ověření reconnect: žádné duplicity (Prompt 025, Krok 6)

- **Kontext**: Krok 6 úkolu Prompt 025 – ověřit, že Reconnect u všech platforem (zejm. Instagram/TikTok) dělá upsert a nevytváří druhý řádek v `social_accounts`.
- **Změna**: Žádná (verifikační krok). Všechny OAuth routy (`tiktok`, `linkedin`, `x`, `auth/callback` pro FB/IG i YouTube) již používají `.upsert(..., { onConflict: "user_id,platform,platform_id" })`. Migrace `012` definuje unikátní index `social_accounts_user_platform_platform_id_key` na `(user_id, platform, platform_id)`, takže upsert koliduje se stávajícím řádkem a aktualizuje ho – **žádné duplicity** při reconnectu.
- **Zjištění (mimo rozsah Kroku 6)**: `POST /api/accounts` stále používá `.insert()` bez `platform_id`/onConflict (legacy ruční token formulář). Není mrtvý – volá ho `onboarding/client.tsx`. Oddělený úklid viz následující akce.
- **Ověření**: Code/DB review všech OAuth route + migrace `012` ✅. Manuální test reconnectu v prohlížeči ✅ (uživatel potvrdil závěr).
- **Upravené soubory**: `ukol.md` (Krok 6 ✅).

### ✨ Feat — Očistění getTokenStatus (čistý render) (Prompt 025, Krok 5)

- **Kontext**: Krok 5 úkolu Prompt 025 – `getTokenStatus` volala `Date.now()` přímo v render-fázi (u každého účtu v `.map`), což dělalo komponentu nečistou a vyžadovalo file-level `eslint-disable react-hooks/purity`.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. `Date.now()` přesunuto z těla `getTokenStatus` do `useMemo(() => Date.now(), [])` (`now`) – počítá se jednou při mountu, ne při každém renderu.
  2. `getTokenStatus(account)` → `getTokenStatus(account, now)` (čistá funkce, žádné `Date.now()` v těle).
  3. File-level `/* eslint-disable react-hooks/purity */` odstraněn; ponechán jen scoped `// eslint-disable-next-line react-hooks/purity` přesně na `useMemo` inicializéru (který je vnitřně nečistý).
- **Ověření**: `npx tsc --noEmit` ✅; `npx eslint` na souboru ✅ (0 errors, jen 3 pre-existing warningy mimo tento zásah: `Clock` nepoužitý, 2× hook deps). Manuální test v prohlížeči ✅ (uživatel potvrdil – token-expiry badge se zobrazuje správně).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 5 ✅)

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
