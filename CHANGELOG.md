# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 💳 Feat — UI propojení BillingCard se Stripe Checkout (Prompt 024, Krok 5)

- **Kontext**: Potřeba napojit tlačítka v ceníku na reálné Stripe Checkout API s loading stavy.
- **Změny**:
  1. `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx`: tlačítka "Upgrade"/"Subscribe" volají `POST /api/stripe/checkout`, přesměrují na Stripe URL. Loading stav přes `useTransition` + `Loader2` spinner.
  2. `src/app/[locale]/(dashboard)/settings/billing/page.tsx`: předán `locale` prop do BillingCard.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil přesměrování na Stripe Checkout).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx`, `src/app/[locale]/(dashboard)/settings/billing/page.tsx`.

### 💳 Feat — Stripe Customer Portal + Manage Subscription UI (Prompt 024, Krok 4)

- **Kontext**: Potřeba API endpointu a UI tlačítka pro správu předplatného ve Stripe Customer Portal.
- **Změny**:
  1. `src/app/api/stripe/portal/route.ts` (nový): `POST /api/stripe/portal` vytvoří Billing Portal session a vrátí URL.
  2. `src/components/billing/manage-subscription-button.tsx` (nový): client komponenta s Button-in-Button pattern, loading stavem, indigo stylingem dle design manuálů.
  3. `src/app/[locale]/(dashboard)/settings/billing/page.tsx`: načítá `stripe_customer_id`, zobrazí ManageSubscriptionButton pokud existuje.
  4. `src/messages/{cs,en,uk}.json`: nové klíče `manageSubscription`, `manageSubscriptionDesc`.
  5. `src/app/api/stripe/checkout/route.ts`: fix `success_url`/`cancel_url` o locale prefix.
  6. `src/app/api/stripe/portal/route.ts`: fix `return_url` o locale prefix.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (Stripe Portal se otevře, návrat na správnou URL).
- **Upravené soubory**: `src/app/api/stripe/portal/route.ts` (nový), `src/components/billing/manage-subscription-button.tsx` (nový), `src/app/[locale]/(dashboard)/settings/billing/page.tsx`, `src/app/api/stripe/checkout/route.ts`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 💳 Feat — Stripe Webhook Handler (Prompt 024, Krok 3)

- **Kontext**: Potřeba API endpointu pro příjem událostí ze Stripe, aby se změny předplatného propsaly do databáze.
- **Změny**:
  1. `src/app/api/webhooks/stripe/route.ts` (nový): handler událostí `checkout.session.completed` (upgrade plan), `customer.subscription.updated` (sync status), `customer.subscription.deleted` (revert na free).
- **Ověření**: `npx tsc --noEmit` ✅, user potvrdil pokračování.
- **Upravené soubory**: `src/app/api/webhooks/stripe/route.ts` (nový).

### 💳 Feat — Stripe Checkout API Route (Prompt 024, Krok 2)

- **Kontext**: Potřeba API endpointu, který vytvoří Stripe Checkout Session pro přechod z free na creator/pro tarif.
- **Změny**:
  1. `src/lib/stripe.ts` (nový): serverový Stripe klient s aktuální API verzí.
  2. `src/app/api/stripe/checkout/route.ts` (nový): `POST /api/stripe/checkout` — autentizace uživatele, vytvoření/opětovné použití Stripe Customer, vytvoření Checkout Session, vrácení URL.
  3. `package.json`: přidán `stripe` npm balíček.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test API v prohlížeči (vrácena platná Stripe Checkout URL) ✅.
- **Upravené soubory**: `src/lib/stripe.ts` (nový), `src/app/api/stripe/checkout/route.ts` (nový), `package.json`.

### 💳 Feat — Stripe databázová příprava (Prompt 024, Krok 1)

- **Kontext**: Integrace platební brány Stripe. Před samotným napojením API je potřeba připravit databázové sloupce pro evidenci Stripe zákazníků a stavu předplatného.
- **Změny**:
  1. `supabase/migrations/035_add_stripe_fields.sql` (nový): přidány sloupce `stripe_customer_id TEXT`, `stripe_subscription_id TEXT`, `subscription_status TEXT`, `trial_ends_at TIMESTAMPTZ` do `public.users`.
  2. `src/lib/supabase/types.ts`: doplněny nové sloupce do `Row`, `Insert` a `Update` typů tabulky `users`.
- **Ověření**: `npx tsc --noEmit` ✅, uživatel potvrdil test migrace.
- **Upravené soubory**: `supabase/migrations/035_add_stripe_fields.sql` (nový), `src/lib/supabase/types.ts`, `ukol.md` (Krok 1 ✅).

### 🎨 Newsletter Footer na Landing Page (Prompt 025, Krok 2)

- **Kontext**: Landing page neměla žádnou patičku ani email capture prvek. Cíl byl přidat newsletter formulář a základní footer s navigací.
- **Změny**:
  1. `src/components/marketing/site-footer.tsx` (nový): server komponenta s newsletter glassmorphism kartou (`rounded-[20px] bg-card/60 backdrop-blur-md`), spodním řádkem (copyright + navigační odkazy).
  2. `src/components/marketing/newsletter-form.tsx` (nový): client komponenta s email inputem a CTA tlačítkem (arrow-in-button pattern). UI-only, bez backend logiky.
  3. `src/app/[locale]/(marketing)/page.tsx`: `<SiteFooter locale={locale} />` přidán za `<FaqSection />`.
  4. `src/messages/{cs,en,uk}.json`: nový `landing.footer.*` namespace (newsletterTitle, newsletterDesc, newsletterPlaceholder, newsletterCta, copyright, 4 odkazy).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/marketing/site-footer.tsx` (nový), `src/components/marketing/newsletter-form.tsx` (nový), `src/app/[locale]/(marketing)/page.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md` (Krok 2 ✅).

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
