# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🌐 Feat — Dokončení lokalizace Landing Page + server locale fix (Prompt 021, Krok 5)

- **Kontext**: Landing page byla přeložená jen částečně. Client části (např. navigace / preview) se přepínaly správně, ale server-renderované sekce Hero, Ceník a FAQ v `en`/`uk` zůstávaly v češtině, protože používaly `getTranslations("landing")` bez explicitního `locale`.
- **Změny**:
  1. `src/app/[locale]/(marketing)/page.tsx`: locale se nově bere přímo z route params a `getTranslations` se volá jako `getTranslations({ locale, namespace: "landing" })`.
  2. `src/components/marketing/pricing-section.tsx` + `src/components/marketing/faq-section.tsx`: odstraněno implicitní čtení locale; obě server komponenty přijímají `locale` z parentu a používají explicitní `getTranslations({ locale, namespace: "landing" })`.
  3. `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` + `src/components/marketing/marketing-nav.tsx`: doplněny/učesány zbývající texty v `landing` namespace, včetně mobile-menu aria labelů a finálního EN/UK copy.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint src/app/[locale]/(marketing)/page.tsx src/components/marketing/pricing-section.tsx src/components/marketing/faq-section.tsx` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil, že vše je v pořádku).
- **Upravené soubory**: `src/app/[locale]/(marketing)/page.tsx`, `src/components/marketing/pricing-section.tsx`, `src/components/marketing/faq-section.tsx`, `src/components/marketing/marketing-nav.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md`.

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
