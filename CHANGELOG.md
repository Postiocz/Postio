## 2026-05-04

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
