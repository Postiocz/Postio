# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## 2026-07-05

### 🐛 Fix — Posts page: „Load more" rozbíjeno při `sort=oldest` (keyset paginace ASC)

- **Kontext**: Stránka Příspěvky (`/posts`) používá keyset (cursor) paginaci s PAGE_SIZE = 20. V `actions.ts` se při `sort="oldest"` (ASC) řadilo `created_at ASC`, ale kurzor se vždy aplikoval přes `.gt()` (greater-than). Při ASC by se ale mělo pokračovat `.lt()`, jinak „Load more" pod `sort=oldest` vrátil prázdnou/špatnou stránku. Stejně tak `nextCursor` se pro ASC bral z posledního řádku místo prvního, takže by další stránka začínala až za koncem seznamu.
- **Oprava**:
  1. V `fetchPostPage()` se kurzor pro `sort="oldest"` nově aplikuje přes `.lt("created_at", cursor)`. `newest` a `publishDate` (DESC) zachovávají `.gt()`.
  2. V `fetchMorePosts()` a `fetchFilteredPosts()` se `nextCursor` pro `sort="oldest"` počítá z **prvního** vykresleného řádku (ASC), pro DESC zůstává z **posledního** řádku (beze změny).
  3. Logika okomentována, aby se kurzorový bug nevrátil.
- **Ověření**: `npx tsc --noEmit` ✅ + manuální test „Load more" pod `sort=oldest` ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/actions.ts`
  - `ukol.md` (Krok 1 označen ✅)
  - `CHANGELOG.md`

## 2026-07-04

### Feat — Auto-Queue: updatePreferences + page.tsx rozšířeni o `posting_schedule` (Krok 5+6)

- **Kontext**: Auto-Queue feature vyžaduje ukládání uživatelského rozvrhu publikování do DB.
- **Změny**:
  1. `actions.ts` – `updatePreferences` čte `posting_schedule` z FormData jako JSON string, parsuje a přidá do update dat s `try/catch`.
  2. `page.tsx` – SELECT query načítá `posting_schedule` z DB (JSONB), předává jako `PostingSchedule | null` prop.
  3. `preferences-form.tsx` – nový `export interface PostingSchedule`, stav s default hodnotou (`enabled: false`, Po–Pá 09:00), FormData serializuje rozvrh jako JSON.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test uložení předvoleb ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/settings/preferences/actions.ts`
  - `src/app/[locale]/(dashboard)/settings/preferences/page.tsx`
  - `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx`

## 2026-07-04

### 🐛 Fix — Dashboard: data pro Recent Posts / Top Labels / Platform Breakdown byla namapovaná na špatné query výsledky

- **Kontext**: Dashboard v `src/app/[locale]/(dashboard)/page.tsx` po předchozím client-side přepisu rozbil synchronizaci proti stránce Příspěvky. V `Promise.all` bylo po páté položce špatně seřazené destructuring pořadí, takže:
  1. `post_tags` widget dostával data z recent posts query,
  2. donut chart dostával data z `post_tags` místo `post_platforms`,
  3. consistency/streak/trend pracovaly s cizím shape,
  4. recent posts četly jen `created_at` a zároveň query sahala na neexistující sloupce `posts.title` a `posts.status`.
- **Oprava**:
  1. Srovnáno pořadí výsledků z `Promise.all`, aby každá dashboard karta četla správný dataset.
  2. Recent posts query nově bere `id, content, created_at, post_platforms(platform, status)` místo neexistujících `title/status`.
  3. Dashboard recent posts nově používají stejnou status logiku jako stránka Příspěvky přes `normalizePost()`, takže badge i obsah vycházejí ze stejného source of truth.
  4. Dočištěn lokální technický dluh v dashboard souboru (`any`, nepoužitý import, `Math.random()` v React key), aby soubor znovu prošel lintem bez warningů a errorů.
- **Ověření**:
  - `npx eslint 'src/app/[locale]/(dashboard)/page.tsx'` ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `CHANGELOG.md`

### 🐛 Fix — Dashboard #2: Hardcoded CZ text v ConsistencyScore → i18n (CS/EN/UK)

- **Kontext**: Komponenta `ConsistencyScore` na dashboardu (`page.tsx`) zobrazovala hardcoded české texty `"Výborná konzistence!"`, `"Dobrá, můžeš lepší!"`, `"Zkus postovat pravidelněji."` — EN/UK uživatelé viděli češtinu.
- **Oprava**:
  1. Do `src/messages/cs.json`, `en.json`, `uk.json` přidány klíče `consistencyExcellent`, `consistencyGood`, `consistencyImprove`.
  2. Komponenta `ConsistencyScore` nově přijímá prop `t: (key: string) => string` a volá `t("consistencyExcellent")` / `t("consistencyGood")` / `t("consistencyImprove")` místo hardcoded řetězců.
  3. Volání na ř. 184 rozšířeno o `t={t}`.
- **Ověření**:
  - `node -e "JSON.parse(...)"` pro cs.json, en.json, uk.json ✅
  - `npx tsc --noEmit` ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`
  - `ukol.md`

### 🐛 Fix — TikTok private-only policy: detekce podle `error.code` + přesnější UX text

- **Kontext**: TikTok `video/init` dál padal i při `privacy_level: "SELF_ONLY"`. Runtime log ukázal, že API vrací policy identifikátor v `error.code = unaudited_client_can_only_post_to_private_accounts`, zatímco naše app private-only chybu hledala v `error.message`, kde je jen obecný odkaz na guidelines. Tím pádem se nespouštěl lokalizovaný handler a uživatel viděl syrový anglický toast.
- **Oprava**:
  1. V [publish-tiktok.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-tiktok.ts) se TikTok private-only chyba nově mapuje primárně z `initData.error.code`, ne jen z `error.message`, takže UI dostane správný `errorCode`.
  2. V [tiktok-publish-errors.ts](file:///c:/VS_Code/Postio/src/lib/tiktok-publish-errors.ts) a překladech `cs/en/uk` zpřesněn text chyby: u neauditované TikTok app nestačí pouze `SELF_ONLY` na příspěvku, ale samotný TikTok účet musí být při publish nastaven jako soukromý.
  3. V [process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) se stejná TikTok policy chyba ukládá i s `error.code`, aby scheduled flow nereportoval jen neurčitý guideline odkaz a private-only retry logika měla konzistentní vstup.
  4. Pro aktivní debug session `tiktok-private-publish` zůstává do potvrzení uživatele dočasně zapnutá instrumentace do Debug Serveru v app publish flow a v UI error mapperu.
- **Ověření**:
  - `npx eslint src/lib/actions/publish-tiktok.ts src/components/edit-post-dialog.tsx supabase/functions/process-scheduled-posts/index.ts src/lib/tiktok-publish-errors.ts` ✅
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅
- **Upravené soubory**:
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/tiktok-publish-errors.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `debug-tiktok-private-publish.md`
  - `CHANGELOG.md`

### 🐛 Fix — Prompt 017-D: TikTok privacy mapping debug log a lokalizace sandbox chyby

- **Kontext**: U TikTok publish flow bylo potřeba ověřit, že editorová volba `Pouze já` opravdu končí v API payloadu jako `privacy_level: "SELF_ONLY"`, a zároveň zastavit únik syrové anglické chyby `unaudited_client_can_only_post_to_private_accounts` do UI.
- **Oprava**:
  1. V `src/lib/actions/publish-tiktok.ts` je tělo `video/init` nově složené do samostatné proměnné `body`, těsně před requestem se loguje přes `console.log("TIKTOK PAYLOAD:", body)` a chyba private-only ze sandboxu vrací vedle textu i stabilní `errorCode`.
  2. V `src/lib/actions/publish.ts` TikTok větev předává `errorCode` dál do UI i jako fallback při detekci raw TikTok message, takže lokalizace není závislá jen na jedné vrstvě.
  3. V `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx` a `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` přidán překladový mapping pro TikTok sandbox private-only chybu, aby uživatel dostal lokalizované vysvětlení místo anglického API textu.
  4. Do `src/messages/cs.json`, `en.json` a `uk.json` doplněn nový řetězec `tiktokSandboxPrivateOnlyError`.
- **Upravené soubory**:
  - `src/lib/tiktok-publish-errors.ts`
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/actions/publish.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`

### 🐛 Fix — Vercel build: untyped select builder pro scheduled Edge Function

- **Kontext**: Produkční deploy na Vercelu znovu padal při `next build` v `supabase/functions/process-scheduled-posts/index.ts` na chybě `Object is of type 'unknown'`. Příčinou bylo, že lokální alias `DenoSupabaseClient` vracel z `.from(...)` čisté `unknown`, ale helpery pro TikTok / YouTube / LinkedIn nad tím dál řetězily `.select().eq().order().limit()`.
- **Oprava**:
  1. V `supabase/functions/process-scheduled-posts/index.ts` doplněn úzký strukturální `UntypedTableBuilder` + `UntypedSelectFilterBuilder`, který pokrývá právě používaný query chain pro `social_accounts`.
  2. Helper `getUntypedUpdateBuilder()` nově staví na společném `getUntypedTableBuilder()` a lookupy `getValidTikTokAccessToken()`, `getValidYouTubeAccessToken()` a `getValidLinkedInAccessToken()` už nevolají `.from(...)` přímo nad `unknown`.
  3. Nešlo o změnu publikační logiky; zásah je čistě typový, aby Edge Function prošla strict TypeScript kontrolou v produkčním buildu.
- **Ověření**:
  - `npm run build` ✅
- **Upravené soubory**:
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

### 🐛 Fix — Prompt 017-C: TikTok private-only fallback + oprava i18n textů v editoru

- **Kontext**: TikTok publish padal na chybě `unaudited_client_can_only_post_to_private_accounts`, protože neauditovaná / testovací aplikace smí publikovat jen jako `SELF_ONLY`. Zároveň bylo potřeba srovnat texty TikTok privacy sekce v `posts` namespace, aby editor používal správné překlady.
- **Oprava**:
  1. V `src/lib/actions/publish-tiktok.ts` doplněna pojistka pro TikTok private-only režim: při detekci dev/test prostředí se privacy přednostně nastaví na `SELF_ONLY`, a pokud `video/init` vrátí chybu `unaudited_client_can_only_post_to_private_accounts`, publish flow automaticky udělá retry se `SELF_ONLY` místo okamžitého failu.
  2. Stejná private-only pojistka doplněna i do `supabase/functions/process-scheduled-posts/index.ts`, aby se okamžité a scheduled TikTok publikování nechovalo rozdílně.
  3. `publish.ts` nyní předává do UI warning code pro úspěšný TikTok publish v private-only režimu a `EditPostDialog` zobrazí lokalizované info v editoru i po úspěšném publishi.
  4. V `src/messages/cs.json`, `en.json`, `uk.json` sjednoceny TikTok privacy texty na požadované znění a doplněn nový lokalizovaný text pro private-only upozornění.
- **Upravené soubory**:
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/actions/publish.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `AGENTS.md`
  - `CHANGELOG.md`

### 🐛 Fix — `posts` namespace znovu obsahuje TikTok texty pro editor příspěvků

- **Kontext**: `EditPostDialog` používá `useTranslations("posts")`, ale část nových TikTok textů pro privacy a creator info byla uložená mimo `posts` namespace. Runtime pak v `/posts` padal na `MISSING_MESSAGE` pro klíče jako `posts.tiktokPrivacyTitle` a `posts.tiktokCreatorInfoSummary`.
- **Oprava**:
  1. Do `src/messages/cs.json`, `en.json`, `uk.json` doplněny chybějící TikTok klíče přímo do sekce `posts` (`tiktokPrivacy*`, `tiktokCreatorInfo*`, `tiktokCapability*`).
  2. V `posts` sekci doplněn i `ttEditNotSupported`, aby TikTok lock banner nepadal při editaci už publikovaného příspěvku.
  3. Oprava je čistě i18n; žádná publish logika ani TikTok API flow se nemění.
- **Upravené soubory**:
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`

### 🐛 Fix — Edge Function Supabase client typ už neblokuje TypeScript build

- **Kontext**: `next build` znovu padal v `supabase/functions/process-scheduled-posts/index.ts` na chybě `Type 'SupabaseClient...' is not assignable ...`, konkrétně při předání `supabaseAdmin` do `getValidYouTubeAccessToken()`. Příčinou byl příliš úzký alias `ReturnType<typeof createClient>`, který v Deno Edge runtime neodpovídal skutečnému generickému tvaru klienta.
- **Oprava**:
  1. Helper alias `DenoSupabaseClient` změněn na úmyslně strukturální typ s metodou `.from(...)`, protože lokální helper vrstva používá právě jen tento minimální kontrakt.
  2. Tím se odstranila falešná generická nekompatibilita mezi Deno klientem v Edge Function a app-side typovou inferencí, aniž by se měnila publish logika pro YouTube, TikTok nebo ostatní platformy.
  3. Lokálně ověřeno přes `npm run build`; build nyní projde kompletně až do finálního route summary bez TypeScript chyb.
- **Upravené soubory**:
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `CHANGELOG.md`

*Starší historii projektu a předchozí milníky najdete v historii Git commitů na GitHubu.*
