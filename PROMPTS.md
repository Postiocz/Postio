# POSTIO – Fokusované prompty pro claude CLI
# Každý prompt zadej samostatně. Čekej na dokončení a schválení před dalším.
# Použití: zkopíruj blok mezi --- a vlož do terminálu jako: claude "..."
# Nebo ulož každý krok jako step-01.md atd. a spusť: claude < step-01.md

---
## KROK 1 – Inicializace projektu
---

Přečti CLAUDE.md pro kontext projektu.

Inicializuj Next.js 14 projekt s názvem "postio":
1. Spusť: `npx create-next-app@latest postio --typescript --tailwind --app --src-dir no --import-alias "@/*"`
2. Nainstal závislosti: `shadcn-ui`, `next-intl`, `@supabase/supabase-js`, `@supabase/ssr`
3. Nastav `tsconfig.json` pro strict mode
4. Vytvoř `.env.local` ze šablony v CLAUDE.md (prázdné hodnoty)
5. Vytvoř `.env.example` jako kopii pro GitHub

Nevytvářej žádný kód navíc – pouze inicializace a závislosti.
Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 2 – Supabase + databáze
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř Supabase konfiguraci a databázovou strukturu:
1. Vytvoř `/lib/supabase/client.ts` – browser klient
2. Vytvoř `/lib/supabase/server.ts` – server klient (SSR)
3. Vytvoř `/lib/supabase/middleware.ts` – helper pro middleware
4. Vytvoř `/supabase/migrations/001_initial_schema.sql` s tabulkami:
   - users (id, full_name, avatar_url, plan, language, streak, created_at)
   - social_accounts (id, user_id, platform, account_name, access_token, is_active)
   - posts (id, user_id, content, media_urls, platforms, scheduled_at, status, published_at)
   - templates (id, user_id, name, content, is_premium)
   - analytics (id, post_id, impressions, engagements, recorded_at)
   - cookie_consents (id, user_id, necessary, analytics, marketing, updated_at)
5. Přidej RLS politiky pro všechny tabulky (users vidí jen svá data)

Vysvětli mi strukturu RLS a čekej na schválení.

---
## KROK 3 – Internacionalizace (next-intl)
---

Přečti CLAUDE.md pro kontext projektu.

Nastav next-intl pro 3 jazyky (cs výchozí, en, uk):
1. Vytvoř `next.config.ts` s next-intl pluginem
2. Vytvoř `middleware.ts` v kořeni – locale detection + Supabase auth refresh
3. Vytvoř strukturu `/messages/cs.json`, `en.json`, `uk.json`
   - Zatím pouze klíče pro auth stránky: login, register, errors, navigation
4. Vytvoř `/app/[locale]/layout.tsx` s NextIntlClientProvider
5. Vytvoř `/i18n/routing.ts` a `/i18n/request.ts`

Piš překlady pro všechny 3 jazyky najednou, ne jen češtinu.
Vysvětli mi strukturu a čekej na schválení.

---
## KROK 4 – Autentifikace
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř kompletní autentifikaci:
1. Vytvoř `/app/[locale]/(auth)/login/page.tsx`
   - Split-screen layout: vlevo hero s motivačním sloganem, vpravo formulář
   - Email + heslo přihlášení
   - Google OAuth tlačítko
   - Odkaz na registraci
   - Animovaný gradient na hero části
2. Vytvoř `/app/[locale]/(auth)/register/page.tsx`
   - Registrace s ověřením emailu
   - Stejný split-screen styl
3. Vytvoř `/app/[locale]/(auth)/forgot-password/page.tsx`
4. Vytvoř `/app/[locale]/(auth)/callback/route.ts` – OAuth callback
5. Aktualizuj `middleware.ts` – chráněné routes přesměrují na /login

Používej shadcn/ui komponenty (Button, Input, Card). Všechny texty přes next-intl.
Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 5 – Onboarding flow
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř 3-krokový onboarding pro nové uživatele:
1. Vytvoř `/app/[locale]/(auth)/onboarding/page.tsx` se 3 kroky:
   - Krok 1: Výběr jazyka (CS / EN / UA s vlajkami)
   - Krok 2: Zobrazované jméno
   - Krok 3: Přeskočit nebo propojit první sociální síť (zatím jen UI, bez reálného API)
2. Progress stepper nahoře
3. Po dokončení uložit do tabulky `users` a přesměrovat na /dashboard
4. Přidat kontrolu v middleware: nový user bez onboardingu → /onboarding

Vysvětli mi flow a čekej na schválení.

---
## KROK 6 – Layout aplikace + dark mode
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř hlavní layout dashboardu:
1. Vytvoř `/components/layout/sidebar.tsx` – boční navigace
   - Logo Postio
   - Navigační položky: Dashboard, Příspěvky, Kalendář, Analytika, Šablony, Nastavení
   - Indikátor aktuálního plánu (Free/Creator/Pro) + progress bar využití
   - Profil uživatele dole
2. Vytvoř `/components/layout/header.tsx`
   - Přepínač jazyků (vlajky)
   - Dark/light mode toggle
   - Notifikace
3. Vytvoř `/components/providers/theme-provider.tsx` – next-themes
4. Nastav CSS variables pro light/dark mode v `globals.css` (barva #6366F1 jako primární)
5. Vytvoř `/app/[locale]/(dashboard)/layout.tsx` s Sidebar + Header

Responzivní: na mobilu sidebar jako drawer.
Vysvětli mi strukturu a čekej na schválení.

---
## KROK 7 – Dashboard stránka
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř hlavní dashboard stránku `/app/[locale]/(dashboard)/page.tsx`:
1. Widget: Motivační citát dne pro tvůrce (statický seznam 10 citátů, rotace dle dne)
2. Stats row: Příspěvky tento týden | Aktuální streak | Využití plánu
3. Streak tracker s počtem dní a ikonou ohně
4. Nadcházející příspěvky – next 7 dní (zatím mock data)
5. Floating action button "Nový příspěvek" (indigo, pravý dolní roh)
6. Banner upozornění pokud user využil >80% free limitu

Všechny texty přes next-intl (cs/en/uk).
Data zatím mock – reálné napojení na Supabase přijde v dalším kroku.
Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 8 – CRUD příspěvků
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř správu příspěvků (napojeno na Supabase):
1. Vytvoř `/lib/actions/posts.ts` – server actions:
   - createPost, updatePost, deletePost, getPostsByUser
   - Kontrola limitu free plánu (max 10/měsíc)
2. Vytvoř `/app/[locale]/(dashboard)/posts/page.tsx` – přehled příspěvků
   - Filter: všechny / draft / naplánováno / publikováno
   - Každý příspěvek: preview textu, platforma, datum, status badge
3. Vytvoř `/components/posts/post-form.tsx` – formulář nového/editace příspěvku:
   - Textový obsah
   - Výběr platforem (Instagram, Facebook, Twitter/X, LinkedIn) – checkboxy s ikonami
   - Datum a čas (datetime picker)
   - Upload obrázku (Supabase Storage)
   - Uložit jako draft / Naplánovat
4. Modální okno při překročení free limitu (10 příspěvků/měsíc)

Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 9 – Systém plánů + pricing stránka
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř systém plánů:
1. Vytvoř `/lib/plans.ts` – konfigurace plánů (limity, ceny, features) jako konstanty
2. Vytvoř `/lib/hooks/usePlan.ts` – hook vracející aktuální plán a limity uživatele
3. Vytvoř `/app/[locale]/pricing/page.tsx`:
   - Tabulka 3 plánů: Free / Creator / Pro
   - Přepínač měsíční/roční (20% sleva na roční)
   - Ceny v Kč / EUR / USD
   - CTA tlačítka (Free: "Začít zdarma", placené: "Vybrat plán")
   - Zatím bez Stripe – tlačítka jen zobrazí "Brzy k dispozici" toast
4. Vytvoř `/components/plan/upgrade-modal.tsx` – modal při dosažení limitu
5. Aktualizuj Sidebar: zobrazit aktuální plán a % využití

Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 10 – Cookie consent + GDPR stránky
---

Přečti CLAUDE.md pro kontext projektu.

Implementuj cookies a GDPR:
1. Vytvoř `/components/cookies/cookie-banner.tsx`:
   - Banner při prvním návštívě (fixed bottom)
   - 3 tlačítka: "Přijmout vše" / "Spravovat" / "Odmítnout"
   - Drawer/modal pro správu kategorií (nezbytné, analytické, marketingové)
2. Vytvoř `/lib/cookies.ts` – uložení souhlasu do localStorage
3. Pro přihlášené uživatele uložit souhlas i do Supabase tabulky `cookie_consents`
4. Vytvoř `/app/[locale]/privacy-policy/page.tsx` – šablona v cs/en/uk
5. Vytvoř `/app/[locale]/terms-of-service/page.tsx` – šablona v cs/en/uk
6. Přidej footer s odkazy: Privacy Policy | Terms | Správa cookies

Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 11 – Nastavení účtu
---

Přečti CLAUDE.md pro kontext projektu.

Vytvoř stránku nastavení `/app/[locale]/(dashboard)/settings/`:
1. `/settings/profile` – jméno, avatar upload (Supabase Storage), email (readonly)
2. `/settings/accounts` – správa propojených sociálních účtů (seznam + odpojit)
3. `/settings/billing` – aktuální plán, datum obnovy, tlačítko upgrade
4. `/settings/notifications` – přepínače emailových notifikací
5. `/settings/cookies` – správa cookie souhlasu (stejné jako banner)
6. `/settings/danger` – smazání účtu (potvrzovací dialog)
7. Společný layout pro settings s tabs navigací

Vysvětli mi co jsi udělal a čekej na schválení.

---
## KROK 12 – Finalizace + README + deployment
---

Přečti CLAUDE.md a CHANGELOG.md pro kontext projektu.

Finalizuj projekt pro deployment:
1. Aktualizuj `README.md` – aktuální stav, všechny features, setup guide
2. Zkontroluj všechny překlady v cs.json, en.json, uk.json – žádné chybějící klíče
3. Vytvoř `vercel.json` s konfigurací pro Next.js
4. Vytvoř `/supabase/seed.sql` – testovací data (1 uživatel, 3 příspěvky)
5. Spusť `npm run build` a oprav všechny TypeScript/ESLint chyby
6. Vytvoř `.github/workflows/ci.yml` – základní CI (build check na push)
7. Přidej `next-sitemap` pro SEO

Vysvětli mi vše a čekej na schválení před deploymentem.
