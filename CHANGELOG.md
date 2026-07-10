# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🔧 Fix — Duplicitní Logo v mobilním overlay menu (Prompt 026, Krok 6)

- **Kontext:** Mobilní overlay (z-40) v `MarketingNav` obsahoval vlastní Logo v horní liště. Fixed navbar (z-50) je skleněný (`bg-white/70 backdrop-blur-md`), takže overlayové Logo prosvítalo skrz a vytvářelo "duplicitní" efekt.
- **Změny:**
  1. `src/components/marketing/marketing-nav.tsx`: mobilní overlay pozadí změněno z `bg-white/85 backdrop-blur-3xl` na plně neprůhledné `bg-white dark:bg-black`, aby skrz navbar nic neprosvítalo.
- **Ověření:** `npx tsc --noEmit` ✅.
- **Upravené soubory:** `src/components/marketing/marketing-nav.tsx`, `ukol.md` (Krok 6).

### 🎨 Feat — Typografie nadpisů sjednocena s Hero + Logo component (Prompt 026, Krok 4)

- **Kontext**: Login page používala ruční `<h1><span>P</span>ostio</h1>` místo sdílené `<Logo />` komponenty a `getStarted` nadpis měl `font-semibold` namísto `font-bold` z Hero typografie.
- **Změny**:
  1. `src/app/[locale]/(auth)/login/page.tsx`: ruční wordmark nahrazen `<Logo />` komponentou pro 100% brand konzistenci (gradient `P` místo `text-primary`). `getStarted` nadpis sjednocen na Hero typografii: `text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl`.
- **Ověření**: `npx tsc --noEmit` ✅, vizuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/app/[locale]/(auth)/login/page.tsx`, `ukol.md` (Krok 4 ✅).

### 🎨 Feat — LoginVisual: sjednocený shell s Hero + fix překrývajících se badge (Prompt 026, Krok 3)

- **Kontext**: Pravý panel login page (`LoginVisual`) měl vlastní SVG gridy, `scale-125` (příčina oříznutí) a floating badge překrývající metriky. Vizuálně neseděl s HeroDashboardPreview.
- **Změny**:
  1. `src/components/auth/login-visual.tsx`: kompletní refaktor — sjednocen shell s `HeroDashboardPreview` (`rounded-[20px] border border-border bg-gradient-hero shadow[...]`, grid overlay, glow bloby). Odstraněn `scale-125` (příčina uříznutí). Badge přesunuty do `absolute -top-4 left-4` (scheduled) a `-bottom-4 right-4` (engagement) mimo card shell. Wrapper `overflow-visible`, card shell `overflow-hidden`. Zachováno i18n.
  2. `src/app/[locale]/(auth)/login/page.tsx`: `pt-12` → `pt-28` na mobile (odstraněn překryv navbaru s nadpisem na mobilu).
- **Ověření**: `npx tsc --noEmit` ✅, vizuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/auth/login-visual.tsx`, `src/app/[locale]/(auth)/login/page.tsx`, `ukol.md` (Krok 3 ✅).

### 🎨 Feat — Auth navbar pro login page (Prompt 026, Krok 2)

- **Kontext**: Login page postrádala konzistentní navigaci — `LocaleSwitcher` byl osamoceně v levém panelu. Chyběl jednotný glass navbar jako na marketingové stránce.
- **Změny**:
  1. `src/components/auth/auth-nav.tsx` (nový): plovoucí glass pill navbar (zjednodušená varianta `MarketingNav`) — `fixed top-6`, `rounded-full`, `backdrop-blur-md`, border + shadow. Logo vlevo (odkaz na `/${locale}`), `LocaleSwitcher` + `ThemeToggle` vpravo. Bez marketing odkazů a CTA.
  2. `src/app/[locale]/(auth)/login/page.tsx`: přidán `<AuthNav />`, odebrán osamocený `<LocaleSwitcher>` z levého panelu.
- **Ověření**: `npx tsc --noEmit` ✅, vizuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/auth/auth-nav.tsx` (nový), `src/app/[locale]/(auth)/login/page.tsx`, `ukol.md` (Krok 2 ✅).

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

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
