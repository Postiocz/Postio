# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🔧 Refactor — Sjednocení výběru účtů: logika (Prompt 029, Krok 1)

- **Kontext**: Stránka „Nový příspěvek" (`posts/new/page.tsx`) stále používala starý výběr obecných platforem (stav `selectedPlatforms`), zatímco `EditPostDialog` už volí konkrétní účty. Cílem je sjednotit obě UI (viz též Prompt 027 Krok 3).
- **Změny**: `selectedPlatforms` převeden z `useState` na odvozený `useMemo` z `selectedAccountIds` + `allAccounts`; přidány stavy `selectedAccountIds`/`allAccounts`; načítání účtů z `GET /api/accounts` (efekt po `userId`); přidán `toggleAccount`; `togglePlatform` nyní vybírá všechny účty dané sítě; `handleRemoveMedia` odebírá účty dle platformy (zrcadlo `EditPostDialog`).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (výběr platformy funkční, edit OK).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`.

### 🔧 Fix — Oprava inicializace Stripe při buildu (Prompt 030)

- **Kontext**: Při deploy na Vercel selhal build s chybou "Neither apiKey nor config.authenticator provided", protože `src/lib/stripe.ts` inicializoval Stripe i když `STRIPE_SECRET_KEY` nebyl nastaven (s prázdným řetězcem).
- **Změny**: `src/lib/stripe.ts` nyní inicializuje skutečnou instanci Stripe pouze pokud `STRIPE_SECRET_KEY` existuje; jinak vrátí dummy objekt s typovou kompatibilitou, který nehazuje chybu při buildu.
- **Ověření**: Lokální `npm run build` úspěšně dokončen ✅.
- **Upravené soubory**: `src/lib/stripe.ts`.

### 🌐 Refactor — Lokalizace a finální cleanup (Prompt 027, Krok 5)

- **Kontext**: Po zrušení manuálního publikování (Kroky 1–2) zůstala v překladech řada nepoužívaných klíčů z původního výběru typu účtu (Profesionální vs Osobní) a rozcestníku `profileChoice*`.
- **Změny**: Odstraněny nepoužívané klíče ze `src/messages/{cs,en,uk}.json`:
  1. Blok v `accounts`: `howToConnect`, `professional`, `professionalDesc`, `personal`, `personalDesc`, `autoPostingBadge`, `notificationsBadge`, `autoPublishing`, `autoPublishingDesc`, `communityReplies`, `communityRepliesDesc`, `postMetrics`, `postMetricsDesc`, `onlyNotifications`, `onlyNotificationsDesc`, `connectProfessional`, `setupPersonal`, `selectTypeSubtitle`.
  2. `accounts.connectModal.profileChoice*` (5 klíčů: `profileChoiceTitle`, `profileChoiceDirectTitle`, `profileChoiceDirectDesc`, `profileChoiceManualTitle`, `profileChoiceManualDesc`).
  Zachovány klíče pro výběr účtů (Krok 3: `posts.connectAccount`, `posts.noConnectedAccounts`).
- **Ověření**: JSON validní ve všech 3 jazycích, `npx tsc --noEmit` ✅, kontrola překladů ✅.
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🔧 Fix — Oprava odesílacího motoru (target `account_id`) (Prompt 027, Krok 4)

- **Kontext**: `publishPost` publikoval jen první `post_platforms` řádek, takže výběr více účtů téže sítě (např. 2× Facebook Page) vedl k publikaci na jediný účet.
- **Změny**: `src/lib/actions/publish.ts` — `publishPost` nyní iteruje přes VŠECHNY pending `post_platforms` řádky a každý cílí přes vlastní `account_id` (`resolveTargetAccount`). Odstraněn legacy IG→FB fallback (čtení `instagram_id` z FB metadat); TikTok používá `row.metadata`; duplicitní guard přepsán z platform-only na `account_id` scope (již publikovaný řádek = no-op success). Cron edge function (`process-scheduled-posts`) již `account_id` používá, žádná změna.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test publikování na konkrétní účet i na 2× FB ✅.
- **Upravené soubory**: `src/lib/actions/publish.ts`.

### 🖼️ Feat — PreviewDialog z Dashboardu + TikTok soft-delete (Prompt 028)

- **Kontext**: Kliknutí na příspěvek v sekci "Poslední příspěvky" na Dashboardu navigovalo na editační stránku, místo aby otevřelo náhled. TikTok nebyl podporován v chytrém mazání (chyběl handler v `deleteFromMeta` a chyběl v `noApiPlatforms`). Archivované účty v editoru nebyly vizuálně odlišeny.
- **Změny**:
  1. `src/app/[locale]/(dashboard)/dashboard/page.tsx`: Rozšířen dotaz na `post_platforms` o `external_id`, `published_at`; `<Link>` nahrazen `<div>` s `onClick` → otevírá `PreviewDialog` (stejný jako v Kalendáři) včetně "Zobrazit na síti" tlačítka.
  2. `src/components/dashboard/delete-post-dialog.tsx`: Přidán `"tiktok"` do `noApiPlatforms` — TikTok se chová jako Instagram/LinkedIn (API warning overlay, badge "Ruční smazání").
  3. `src/lib/actions/publish.ts` (`deleteFromMeta`): Nový handler pro TikTok — archivace `post_platforms` řádku (`status: "archived"`, smazán `external_id`), vrací `cannotDeleteViaApi: true`.
  4. `src/components/edit-post-dialog.tsx`: Přidána detekce `archivedAccountIds`; archivované účty se v editoru zobrazí šedé (`opacity-50`, `pointer-events-none`), nejsou přepínatelné; metadata save zachovává vazbu.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/delete-post-dialog.tsx`, `src/lib/actions/publish.ts`, `src/components/edit-post-dialog.tsx`.

### ✨ Feature — Plná podpora více účtů v Editoru (Prompt 027, Krok 3)

- **Kontext**: Uživatel může mít připojeno více účtů stejné sítě (např. 2× Facebook Page). Editor umožňoval výběr jen 6 statických platforem bez vazby na konkrétní účet. Cílem bylo přepracovat výběr na seznam všech připojených účtů seskupených dle sítě.
- **Změny**:
  1. `src/components/edit-post-dialog.tsx`: Přidáno načítání účtů z `/api/accounts`; stav `platforms: string[]` nahrazen `selectedAccountIds: string[]`; UI přepracováno na grid 3 (desktop) / 2 (mobil) platformových karet s kompaktními chipy uvnitř.
  2. `src/lib/actions/posts.ts`: `createPostAction` a `updatePost` přijímají `accountIds`; ukládá se `account_id` do `post_platforms`; legacy fallback pro NULL `account_id`.
  3. `src/lib/supabase/types.ts`: Typy již obsahují `account_id`.
  4. `src/messages/{cs,en,uk}.json`: Přidány klíče `posts.connectAccount` a `posts.noConnectedAccounts`.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/lib/actions/posts.ts`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🔧 Refactor — Zjednodušení připojování účtů (Prompt 027, Krok 2)

- **Kontext**: Po odstranění manuální logiky (Krok 1) je potřeba dokončit zjednodušení připojování — odstranit `publishing_type` z OAuth redirect URL a `profileChoice*` překlady. Připojení nového účtu vždy rovnou spouští OAuth bez výběru typu profilu.
- **Změny**:
  1. `src/components/connect-account-modal.tsx`: `onConnect` i `handleConnect` již nepřijímají `publishingType` parametr; odstraněny `profileChoice*` klíče z typové definice `t`.
  2. `src/app/[locale]/(dashboard)/accounts/page.tsx`: odstraněno předávání `publishing_type` z OAuth redirect URL pro Instagram i Facebook; odstraněny `profileChoice*` překladové mapování; `onConnect` handler bez parametru.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test připojení v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/connect-account-modal.tsx`, `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 2 ✅).

### 🧹 Refactor — Odstranění manuálního publikování (Prompt 027, Krok 1)

- **Kontext**: Meta API nepublikuje na osobní profily, funkce „Manuální publikování s připomínkou" byla nefunkční. Postio se stává čistě profesionálním nástrojem pro automatické publikování; rušíme celou `manual` vs `direct` logiku a připravujeme půdu pro plnou podporu více firemních účtů.
- **Změny**:
  1. `src/lib/actions/publish.ts`: odstraněny `getAccountPublishingType` + `markManualReady` a obě větve, které parkovaly `post_platforms` řádek jako `status='ready'` a vracely se před voláním API. Cílení přes `account_id` (Krok 4.2) zachováno.
  2. `supabase/functions/process-scheduled-posts/index.ts`: odstraněn blok, který při cronu kontroloval `publishing_type='manual'` a přeskakoval API; nyní se publikuje vždy automaticky.
  3. `src/app/[locale]/(dashboard)/dashboard/page.tsx`: odstraněn `ManualPublishWidget` + typy `ManualReadyRow`/`ManualReadyPost`, dotazy 8+9 (manuální účty / `ready` řádky), agregace a `Bell` import.
  4. `src/components/edit-post-dialog.tsx`: odstraněn `PublishingTypeBadge`, stav `publishingTypeMap` (i jeho naplňování) a 4 použití, `Zap`/`Bell` importy.
  5. `src/components/connect-account-modal.tsx`: odstraněn `showProfileChoice`, výběr Profil vs Osobní i ⚡/🔔 badge; klik na ikonu sítě rovnou volá `handleConnect("direct")`.
  6. `src/app/[locale]/(dashboard)/accounts/page.tsx`: odebráno předávání `showProfileChoice`.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil: připojení bez výběru profilu, v editoru žádná 🔔/⚡, dashboard bez widgetu „Připraveno k ručnímu zveřejnění").
- **Upravené soubory**: `src/lib/actions/publish.ts`, `supabase/functions/process-scheduled-posts/index.ts`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/components/edit-post-dialog.tsx`, `src/components/connect-account-modal.tsx`, `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 1 ✅).

### 🎨 Feat — Vizuální indikátory publikování v Editoru (Prompt 026, Krok 3)

- **Kontext**: Po zavedení `publishing_type` (Kroky 1-2) potřebuje uživatel v editoru příspěvku vidět, zda daný účet publikuje automaticky, či manuálně s připomínkou.
- **Změny**:
  1. `src/components/edit-post-dialog.tsx`: fetch účtů nově tahá `publishing_type`, sestaven stav `publishingTypeMap` (`platform -> direct|manual`).
  2. Nový `PublishingTypeBadge` (16px glassmorphism odznáček): `Zap` (indigo) pro `direct` = Automatické publikování, `Bell` (amber) pro `manual` = Manuální publikování s připomínkou; tooltip přes nativní `title`.
  3. Odznáček přidán ke všem ikonám platforem v editoru: výběr platforem, preview tabs, dodatečná tlačítka „Publikovat na…" a „Aktualizovat na…". Zobrazuje se jen u propojených účtů s známým `publishing_type`.
- **Ověření**: `npx tsc --noEmit` ✅, vizuální test v prohlížeči ✅ (uživatel potvrdil ⚡/🔔 s tooltipem).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `ukol.md` (Krok 3 ✅).

### 🔗 Feat — Rozcestník profilu při připojování (Prompt 026, Krok 2)

- **Kontext**: Osobní profily (Instagram, Facebook) nelze publikovat přes API. Při propojování je třeba nechat uživatele zvolit typ účtu (Profesionální = automaticky / Osobní = manuálně s připomínkou) a tuto volbu zapsat do `social_accounts.publishing_type`.
- **Změny**:
  1. `src/components/connect-account-modal.tsx`: nový prop `showProfileChoice` + `onConnect(publishingType)`; pro IG/FB zobrazen rozcestník dvou glassmorphism karet (Profesionální / Osobní). Ostatní platformy ponechávají původní jediné tlačítko.
  2. `src/app/[locale]/(dashboard)/accounts/page.tsx`: předání `showProfileChoice` (jen IG/FB) a připojení `&publishing_type=direct|manual` do OAuth `redirectTo`; doplněny překladové klíče.
  3. `src/app/auth/callback/route.ts`: načtení `publishing_type` z URL (fallback `direct`) a zápis do všech upsert řádků `social_accounts`.
  4. `src/messages/{cs,en,uk}.json`: nové klíče `connectModal.profileChoice*` (Krok 6 přebírá plnou lokalizaci).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test připojení IG/FB v prohlížeči ✅ (uživatel potvrdil; volba se propíše do `publishing_type`).
- **Upravené soubory**: `src/components/connect-account-modal.tsx`, `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/app/auth/callback/route.ts`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md` (Krok 2 ✅).

### 🌐 Feat — DB migrace pro manuální publikování (Prompt 026, Krok 1)

- **Kontext**: Osobní profily (Instagram, Facebook) nepodporují automatické odesílání přes API. Pro manuální publikování s připomínkou je třeba evidovat typ publikování na účtu a nový status příspěvku „připraveno ke zveřejnění".
- **Změny**:
  1. `supabase/migrations/036_add_publishing_type.sql` (nový): `ALTER TABLE social_accounts ADD COLUMN publishing_type TEXT NOT NULL DEFAULT 'direct' CHECK (publishing_type IN ('direct','manual'))`; rozšířen `post_platforms_status_check` o hodnotu `'ready'`.
  2. `src/lib/supabase/types.ts`: `publishing_type?: 'direct' | 'manual'` přidáno do `Row`/`Insert`/`Update` u `social_accounts`.
- **Ověření**: `npx tsc --noEmit` ✅, migrace spuštěna na Supabase ✅ (uživatel potvrdil).
- **Upravené soubory**: `supabase/migrations/036_add_publishing_type.sql` (nový), `src/lib/supabase/types.ts`, `ukol.md` (Krok 1 ✅).

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
