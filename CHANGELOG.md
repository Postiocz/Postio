# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## 2026-07-07

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 4: Auto-Deselect)

- **Kontext**: Finální krok úkolu Prompt 023. Krok 1 přidal `disabled` logiku, Krok 2 vizuální zpětnou vazbu (zeslabení + tooltip), Krok 3 překlady. Krok 4 zajišťuje, že vybraná platforma se automaticky odškrtne, když uživatel smaže médium, které požaduje.
- **Změna** (`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`):
  1. Nový handler `handleRemoveMedia(id)` nahrazuje přímé volání `removeMediaItem` na tlačítku pro mazání média.
  2. Handler spočítá množinu médií *po* smazání (`nextMedia`) a odvodí `nextHasVideo` / `nextHasAnyMedia`, pak z `platforms`/`selectedPlatforms` odfiltruje jen platformy, jejichž požadavek je v nové množině splněn (TikTok/YouTube → video, Instagram → jakékoliv médium).
  3. Odfiltrují se **pouze** platformy, které přestaly vyhovovat — nikdy se nepřidávají zpět (vrátí-li uživatel média, musí platformu zaškrtnout znovu).
  4. Záměrně implementováno jako handler události, ne `useEffect` + `setState` (lint pravidlo `react-hooks/set-state-in-effect` by to zamítlo).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na obou souborech ✅ (zbývá jen pre-existing warning na nepoužitý `eslint-disable` v TikTok náhledu).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 4 označen ✅, sekce úkolu smazána dle Pravidla 7), `CHANGELOG.md`

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 2: UI)

- **Kontext**: Pokračování úkolu Prompt 023. Krok 1 přidal logiku `disabled`; Krok 2 přidává vizuální zpětnou vazbu (zeslabení + tooltip s vysvětlením).
- **Změna**:
  1. Nová komponenta `src/components/ui/tooltip.tsx` (Radix `Tooltip`, portálovaná do `<body>`, takže ji neoorízne scroll kontejner dialogu).
  2. `edit-post-dialog.tsx` i `posts/new/page.tsx`: zakázaná tlačítka platforem dostala `opacity-50 cursor-not-allowed`.
  3. Když je tlačítko zakázané kvůli chybějící příloze, je obaleno `Tooltipem` s i18n vysvětlením (`tiktokRequiresVideo` / `youtubeRequiresVideo` / `instagramRequiresMedia`, klíče z Krok 3).
  4. Disabled `<button>` je zabalen do vždy-interaktivního `<span>`u (disabled tlačítko nevysílá hover události, tooltip by nefungoval). Sekce platforem obalena `TooltipProvider`.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na všech 3 souborech ✅ (jediná výtka je pre-existing warning v TikTok náhledu).
- **Upravené soubory**: `src/components/ui/tooltip.tsx` (nový), `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 2 označen ✅)

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 3: překlady)

- **Kontext**: Pokračování úkolu Prompt 023. Krok 3 přidává i18n klíče pro tooltipy, které se použijí v Krok 2 (Tooltip při najetí na zakázané tlačítko platformy).
- **Změna** (`src/messages/cs.json`, `en.json`, `uk.json`):
  1. Do namespace `posts` (a záložně i `calendar`, kde stejné klíče duplikovaně existují) přidány 3 klíče: `tiktokRequiresVideo`, `youtubeRequiresVideo`, `instagramRequiresMedia`.
  2. Překlady cs / en / uk s vysvětlením požadavku na přílohu (video / médium).
- **Ověření**: JSON validní ve všech 3 souborech ✅ (`node -e JSON.parse`).
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md` (Krok 3 označen ✅)

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 1)

- **Kontext**: Úkol Prompt 023 – zabránit výběru platformy, která nepodporuje nahraný typ obsahu (např. TikTok bez videa). Krok 1 zavádí pouze validační logiku (disabled stav); vizuální zvýraznění (opacity-50 / Tooltip) přijde v Krok 2 a auto-odškrtnutí vybrané platformy po smazání média v Krok 4.
- **Změna** (`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`):
  1. Přidány memoizované příznaky `hasVideoAttachment` / `hasAnyMediaAttachment` odvozené z `mediaItems` (vynechány chybné uploady `status === "error"`).
  2. Přidána `isPlatformMediaRequirementMet(platformId)`: TikTok & YouTube vyžadují video, Instagram vyžaduje jakékoliv médium, Facebook/X/LinkedIn podporují cokoliv.
  3. Tlačítka platforem dostala `disabled`, když požadavek není splněn a platforma není již publikovaná (`isPublished`).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na obou souborech ✅ (jediná výtka je pre-existing warning na řádku 1550 v TikTok náhledu, mimo tento zásah).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 1 označen ✅)

### ✨ Feat — Dashboard: redesign karty „Poslední příspěvky" (Krok 3, úkol dokončen)

- **Kontext**: Finální krok úkolu. Karta v sekci Poslední příspěvky (`page.tsx`) ukazovala jen text + absolutní datum a klikatelný byl pouze vnitřek.
- **Změna** (`src/app/[locale]/(dashboard)/page.tsx`):
  1. Celá `<Card>` je klikatelná — `<Link>` ji obaluje (`group` + `group-hover`).
  2. Ikony platforem (reuse `platformIcons`, dedup, max 5; fallback `FileText`).
  3. Miniatura prvního média (`aspect-video`, video/obrázek přes `isVideoUrl`) + overlay „+N" pro další.
  4. Relativní čas přes `Intl.RelativeTimeFormat` (helper `formatRelativeTime`, nad ~30 dní absolutní datum); u `scheduled` postů „Naplánováno na {datum}" (nový i18n klíč `dashboard.scheduledFor` v cs/en/uk).
  5. Max 2 barevné štítky (tečka v barvě + název) + „+N".
  6. Purita: „teď" zachyceno jednou přes `useState(() => Date.now())` (ESLint react-hooks/purity zakazuje `Date.now()` v renderu).
- **🐛 Bugfix při testování**: `scheduled_at` **není sloupec tabulky `posts`** (je na `post_platforms`). Krok 2 ho omylem přidal do top-level selectu → PostgREST 400 → query 4b spadla → sekce Poslední příspěvky celá zmizela. Opraveno: `scheduled_at` přesunut do embedu `post_platforms(...)`, v mapování se bere nejbližší naplánovaný čas napříč platformami. Ověřeno přímým dotazem (200 OK).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `page.tsx`, `src/messages/cs.json` / `en.json` / `uk.json`, `ukol.md` (úkol dokončen a smazán), `CHANGELOG.md`

### ✨ Feat — Dashboard: rozšíření dat pro Poslední příspěvky (Krok 2)

- **Kontext**: Karta Posledního příspěvku měla pro plánovaný redesign (Krok 3) k dispozici jen `id/content/created_at/status`. Chyběla data pro ikony platforem, miniaturu média, relativní/plánovaný čas a barevné štítky.
- **Změna** (`src/app/[locale]/(dashboard)/page.tsx`):
  1. Query 4b (`posts`) select rozšířen o `scheduled_at, media_urls, post_tags(tags(id, name, color))`. Vnořený join je RLS-filtrovaný přes rodiče `posts` (stejný vzor jako stránka Příspěvky).
  2. Typ `RecentPostItem` doplněn o `scheduled_at`, `platforms`, `media_urls`, `post_tags`.
  3. Typ `RecentPostRow` doplněn o `scheduled_at`, `media_urls`, `post_tags` (reuse `PostTagJoinRow`).
  4. Mapování přes `normalizePost` propaguje nová pole do `RecentPostItem`.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na `page.tsx` ✅, dashboard naběhne beze změny UI ✅ (uživatel potvrdil — data se zatím jen načítají navíc).
- **Upravené soubory**: `page.tsx`, `ukol.md` (Krok 2 ✅), `CHANGELOG.md`

### 🐛 Fix — Dashboard: status `publishing` v Posledních příspěvcích nebyl lokalizovaný (Krok 1)

- **Kontext**: `normalizePost` může pro post vrátit computed status `"publishing"`, ale `recentPostStatusLabels` v dashboardu (`page.tsx`) ho nemapoval a klíč `statusPublishing` neexistoval v žádném jazyce — badge by ukázal syrové anglické "publishing" ve všech 3 locales. Badge barvy `publishing` také neřešily (spadl do šedé draft větve).
- **Oprava**:
  1. Do `posts` namespace v `cs.json` / `en.json` / `uk.json` přidán klíč `statusPublishing` — "Publikuje se" / "Publishing" / "Публікується".
  2. `recentPostStatusLabels` doplněn o `publishing: postsT("statusPublishing")`.
  3. Badge dostal větev pro `publishing`: `bg-indigo-500/10 text-indigo-400 animate-pulse` (pulz naznačuje probíhající publikaci).
- **Ověření**: JSON validní ve všech 3 souborech ✅, `npx tsc --noEmit` ✅, `npx eslint` na `page.tsx` ✅, dashboard se vykresluje beze změny ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`
  - `ukol.md` (nový úkol "Vylepšení – Dashboard Poslední příspěvky", Krok 1 označen ✅)
  - `CHANGELOG.md`

### ✨ Feat — Reset hesla (Krok 6): forgot mode v `email-signin.tsx` (flow uzavřen)

- **Kontext**: Poslední článek celého flow. Tlačítko „Zapomněli jste heslo?" v `email-signin.tsx` bylo mrtvé (bez `onClick`). Krok 6 ho aktivuje a napojuje `resetPasswordAction` z Kroku 2.
- **Změna**: V `src/components/auth/email-signin.tsx`:
  1. `type Mode` rozšířen o `"forgot"`; přidán import `resetPasswordAction` + samostatný `useActionState(resetPasswordAction, …)` (`resetState`/`resetFormAction`/`isResetPending`), aby se reset formulář nebil se sign-in/sign-up submitem.
  2. Při `mode === "forgot"` se renderuje samostatný forgot-formulář (titulek + popis z i18n, jen e-mail input, tlačítko `sendResetLink`/`sendingResetLink`); jinak beze změny původní sign-in/sign-up formulář.
  3. Tlačítko „Zapomněli jste heslo?" dostalo `onClick={() => setMode("forgot")}` (+ vyčistí heslo); v forgot módu přidán odkaz „Zpět na přihlášení" (`backToSignIn`) zpět na `signin`.
  4. Error/success text je nově mode-aware — v forgot módu čte `resetState` (zelená hláška „Odkaz odeslán…" po úspěchu), jinak `state`.
  5. Preexisting `set-state-in-effect` v `useEffect` (reset po signupu) opatřen `eslint-disable` komentářem — stejný vzor jako v nedávném ESLint refactoru.
- **Ověření**: `npx tsc --noEmit` ✅ + `npx eslint` na souboru ✅ + manuální test celého flow (forgot view → e-mail → recovery odkaz → reset-password → nové heslo → přihlášení) ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/components/auth/email-signin.tsx`
  - `ukol.md` (Krok 6 označen ✅, sekce úkolu následně smazána dle Pravidla 7)
  - `CHANGELOG.md`

### ✨ Feat — Reset hesla (Krok 5): auth callback zpracuje recovery odkaz

- **Kontext**: Poslední chybějící článek serverové části flow. Recovery magic link z e-mailu míří na `/auth/callback?type=recovery&next=/{locale}/login/reset-password&code=...`. Bez explicitní obsluhy by generická OAuth větev callbacku uživatele omylem poslala na `/accounts` (příp. `verify-2fa` u 2FA účtů) místo na reset stránku.
- **Změna**: V `src/app/auth/callback/route.ts`:
  1. Nová funkce `handleRecoveryCallback` — odvodí `locale` z `next`/refereru, bezpečně validuje `next` (jen locale-prefixed interní cesta, jinak fallback `/{locale}/login/reset-password`), vymění `code` za session přes `exchangeCodeForSession` se správným cookie handlingem a přenese auth cookies na redirect, aby reset stránka viděla recovery session pro `updateUser`.
  2. V `GET` handleru přidán check `type === "recovery"` hned za YouTube větví — deleguje na `handleRecoveryCallback` **před** generickou OAuth logikou (záměrně přeskakuje OAuth token harvesting, 2FA větev i `?fb=connected` hint, které by recovery flow rozbily).
  3. Bonus: opraven preexisting `prefer-const` (let `response` → const) v `GET`, aby soubor prošel lintem čistě.
- **Ověření**: `npx tsc --noEmit` ✅ + `npx eslint` na souboru ✅ (plný manuální test flow po Kroku 6)
- **Upravené soubory**:
  - `src/app/auth/callback/route.ts`
  - `ukol.md` (Krok 5 označen ✅)
  - `CHANGELOG.md`

### ✨ Feat — Reset hesla (Krok 4): stránka "Nastavit nové heslo"

- **Kontext**: UI stránka, kam recovery odkaz z e-mailu uživatele dovede (napojení callbacku je Krok 5). Napojuje `updatePasswordAction` z Kroku 3.
- **Změna**: Vytvořeny 2 nové soubory pod `login/reset-password/`:
  1. `page.tsx` (server) — načte překlady, sestaví `labels`, vyrenderuje layout se stejným designem jako verify-2fa (grid pattern, glassmorphism card `rounded-[32px]`, Postio logo, indigo accent).
  2. `reset-password-form.tsx` (client) — `useActionState(updatePasswordAction)`, 2 password inputy (nové + potvrzení) se sdíleným show/hide toggle, mapování `errorKey` na lokalizované hlášky, pending Loader2 spinner, success view se zelenou fajfkou + tlačítkem "Zpět na přihlášení".
- **Ověření**: `npx tsc --noEmit` ✅ (plný manuální test flow až po Kroku 5+6)
- **Upravené soubory**:
  - `src/app/[locale]/(auth)/login/reset-password/page.tsx` (nový)
  - `src/app/[locale]/(auth)/login/reset-password/reset-password-form.tsx` (nový)
  - `ukol.md` (Krok 4 označen ✅)
  - `CHANGELOG.md`

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
