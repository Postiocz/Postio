# Postio – Pracovní plány

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ**:
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceš začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování)**:
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceš pokračovat. Nikdy nedělej více kroků najednou!

3. **TESTOVÁNÍ PŘED ZÁPISEM**:
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

4. **GIT COMMIT (Automaticky po Pravidle 7 – smazání úkolu)**:
   Jakmile je úkol kompletně hotový, test potvrzený (Pravidlo 3), zapsaný do `CHANGELOG.md` a sekce úkolu smazána z `ukol.md` (Pravidlo 7), **automaticky provedeš `git add -A` a `git commit`** — tím se jedním commitem uloží všechny změny včetně smazání sekce z `ukol.md`. Po commitu se ujisti, že `git status` ukazuje **čistý working tree** ("nothing to commit, working tree clean"). Teprve pak se zastav a zeptej se mě, jak chceš pokračovat (dle Pravidla 2). **Neprováděj `git push`** — ten dělá výhradně uživatel sám.

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ**:
   Pracujeme s lokálním modelem a máme tvrdý limit kontextového okna. Pro ochranu před přehlcením paměti:
   - Buď ve své odpovědi maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jednu funkci — používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutně.

6. **AUTOMATICKÉ PROŘEZÁVÁNÍ CHANGELOGU (Zero-Token Auto-Drop)**:
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 3) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, ten úplně nejstarší záznam ze dna `CHANGELOG.md` JEDNODUŠE SMAŽ (odstraň ze souboru). Žádný archivní soubor neotevírej, nečti ani nevytvářej — stará historie zůstane trvale v Gitu (zachráněna commitem v Kroku 4) a my tímto šetříme 100% kontextových tokenů pro programování.

7. **MAZÁNÍ KOMPLETNĚ HOTOVÝCH ÚKOLŮ**:
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden poslední `git commit` (Pravidlo 4), u posledního kroku z Aktuálních úkolů, tak smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce) a nadpis ## 11. AKTUÁLNÍ ÚKOLY. Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLŮ (Taste Skill)**:
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
     1. .agents/skills/design-taste-frontend/SKILL.md
     2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL**:
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"

10. **KONTROLA GIT VĚTVE PŘED ÚPRAVOU KÓDU**:
    Před JAKOUKOLIV úpravou kódu vždy nejdřív zkontroluj aktuální git větev (`git branch --show-current` nebo ekvivalent). Pokud jsi na `main`, NESMÍŠ rovnou editovat – místo toho:
    a) Navrhni vhodný název nové pracovní větve podle řešeného úkolu/problému (např. `fix/notifications-link`, `feature/target-accounts`).
    b) Vytvoř tuto větev a přepni se na ni (`git checkout -b <název>`).
    c) Teprve pak pokračuj v editaci podle běžného workflow (jeden krok, stop, schválení).
    Pokud už jsi na jiné než main větvi, pokračuj normálně bez vytváření nové.

---

## 11. AKTUÁLNÍ ÚKOLY

### 🐛 HOTFIX: Publish tlačítko „cukne a scrolluje" (1. klik selže) + Delete modály jen v češtině

**Kontext (2026-09-28):** Uživatel nahlásil 2 chyby na branch `fix/publish-button-layout-and-delete-i18n`:
1. **Publish tlačítko** – první klik „cukne a posune se dolů", publish neproběhne; teprve druhý klik publikuje správně.
2. **Delete modál u příspěvku** – po kliknutí na ikonu koše se otevře modál, který je pouze v češtině; chybí EN/UK překlady.

---

#### Analýza BUG #1 – publish tlačítko (neproběhne na 1. klik)

**Postižená místa (stejný vzor):**
- `src/app/[locale]/(dashboard)/posts/new/page.tsx:1591-1599` – publish button `handlePublishNow`
- `src/components/edit-post-dialog.tsx:2897-2912` – publish button `handlePublishNow`
- (analogicky kalendář `_calendar-view.tsx:1193-1201` + `new-post-modal.tsx:305-313`)

**Zjištěné mechanismy (kumulovaně způsobují „cuknutí + posun dolů + spolknutí kliku"):**
1. **Layout shift v akčním footru** – nad tlačítky se vykresluje media-policy banner (`posts/new`:1528-1561, `edit-post-dialog`:2712-2744), který se objeví/změní a **posune řadu tlačítek dolů**. Po kliku navíc `setPublishing(true)` změní label („Publikovat nyní" → „Ukládání…") a vloží spinner ikonu → **mění se šířka tlačítka** (flex-wrap row se může přelomit do nové řádky).
2. **Press animace** – `active:scale-[0.98]` (a base `active:translate-y-px`) = viditelné „cuknutí" při stisku.
3. **Výsledek:** Pokud se tlačítko mezi mousedown a mouseup posune (banner se objeví / šířka se změní / wrap), browser click event **nespalí na původním elementu** → `handlePublishNow` se vůbec nespustí → uživatel musí kliknout podruhé na nové pozici → ihned funguje.

**Plán oprav (pořadí):**
- [x] **KROK 1 – Stabilizovat pozici tlačítek:** akční footer dostane pevnou výšku pro banner (možnost „rezervovaný slot" / min-height) NEBO se media-policy banner přesune mimo footr, aby řada tlačítek při objevení banneru NEskákala. Aplikovat na `posts/new` + `edit-post-dialog` (a případně kalendář). ✅ (2026-09-28: rezervovaný slot `min-h-[44px]` kolem banneru v `posts/new` + `edit-post-dialog`; `tsc` 0 chyb; uživatel potvrdil, že klik už funguje)
- [ ] **KROK 2 – Stabilizovat šířku publish tlačítka:** minimální šířka / rezervované místo pro spinner, aby swap label → spinner nerozhazoval wrap. `type="button"` explicitně (již je).
- [ ] **KROK 3 – Zpřesnit klik (belt-and-suspenders):** zvážit odstranění `active:scale-[0.98]` z publish tlačítka (cuknutí) nebo posun handleru z `onClick` na robustnější střelbu – rozhodnutí po manuálním testu; primárně KROK 1+2.
- **Ověření:** `npx tsc --noEmit` + manuál test v prohlížeči (1. klik musí publikovat, žádný posun).

---

#### Analýza BUG #2 – delete modál pouze v češtině

**Postižené soubory:**
- `src/components/dashboard/delete-post-dialog.tsx` – natvrdo česky: „Smazat příspěvek" (ř. 199), `descriptionText` 4 větve (ř. 176-189), „Načítám aktuální stav…" (211), „Smazat z {name}" (242), „Ruční smazání" (255), „Trvale smazat z aplikace Postio" (278), poznámka (284), „Zrušit" (347), „Potvrdit smazání" (356), „Mažu…" (332/356). Část má fallbacky `t("...") || "cz"` (apiDeletionWarningTitle, deleteDialogBack, toastUnderstood) již v `posts` namespace.
- `src/components/dashboard/smart-delete-dialog.tsx` – CELÝ modál natvrdo česky (Chytré mazání, 2 varianty, auto-delete štítky `AUTO_DELETE_LABELS`, tlačítka „Probíhá…", „Ponechat jako koncept", „Smazat trvale").

**Který modál se otevře při ikoně koše (`_post-card.tsx`):**
- status `removed_externally` → `SmartDeleteDialog` (ř. 425-434)
- ostatní statusy → `DeletePostDialog` (ř. 449-459)

**Plán oprav (pořadí):**
- [x] **KROK 1 – i18n klíče do `posts` namespace** v cs/en/uk (`/messages/*.json`), terminologie dle existujících klíčů (deleteDeleteDialogBack, toastUnderstood…): ✅ (2026-09-28; JSON validní ve 3 localech, 255 klíčů shodně)
  - 🛠️ **Odchylky od plánu:** klíč `confirmDelete` už v `posts` namespace existuje s textem „Opravdu chcete smazat tento příspěvek?" (nepoužívá se, ale nechávám ho být) → tlačítko „Potvrdit smazání" dostalo nekolizní název `confirmDeleteButton`. Navíc přidán `smartDeletePermanently` = „Smazat trvale" (label confirm tlačítka u varianty delete_from_app; v plánu chyběl). `deleteDialogTitle` samostatně nepřidán – v KROK 2 se znovu použije existující `deletePost`. Slova jako „Smazat z LinkedIn“ v desc textech zůstávají jako součást vět (doslovné překlady klíčů deleteFromApp/manualDeletion).
  - DeletePostDialog: `deleteDialogDescNoPlatform`, `deleteDialogDescLinkedinOnly`, `deleteDialogDescMixed`, `deleteDialogDescSelective`, `deleteDialogLoading`, `deleteFromAccount` ({account}), `manualDeletion`, `deleteFromApp` = „Trvale smazat z aplikace Postio", `deleteKeepNote`, `deleting` = „Mažu…", `confirmDeleteButton` = „Potvrdit smazání".
  - SmartDeleteDialog: `smartDeleteDialogTitle`, `smartDeleteDialogDesc`, `smartDeleteKeepDraft`, `smartDeleteKeepDraftHint`, `smartDeleteDeleteApp`, `smartDeleteDeleteAppHint`, `smartDeletePermanently`, `smartDeleteAuto` = „Automatické mazání", `smartDeleteAutoHint`, `smartDeleteAutoOptionNever/3d/7d/30d/365d`, `smartDeleteInProgress` = „Probíhá…".
- [x] **KROK 2 – DeletePostDialog:** nahradit hardcoded stringy `t("...")` voláními (title `deletePost`, 4 větve `descriptionText`, loading, „Smazat z {account}", „Ruční smazání", „Trvale smazat z aplikace", poznámka, „Zrušit" → `cancel`, „Mažu…" 2x → `deleting`, „Potvrdit smazání" → `confirmDeleteButton`). ✅ (2026-09-28; `tsc` 0 chyb; zbývají jen záměrné fallbacky `t(...) || "cz"` u apiDeletionWarningTitle/deleteDialogBack/toastUnderstood)
- [ ] **KROK 3 – SmartDeleteDialog:** přidat `useTranslations("posts")`, nahradit všechny stringy vč. `AUTO_DELETE_LABELS` (mapovaný přes i18n).
- **Ověření:** `npx tsc --noEmit` + JSON validita ve 3 localech + manuál test (koš u draftu i `removed_externally`, přepnutí cs/en/uk).

---

**Kontext (2026-09-19):** FÁZE 1 (per-target analytics model) je hotová pro DB, backend, Posts stránku i Analytics stránku (vč. drill-downu). Kalendář `/kalendar` je poslední zbývající díl – dle původního zadání byl záměrně vynechán. Úkol: zobrazit analytiku (počet interakcí) na kartách příspěvků v kalendáři konzistentně s per-target modelem.

### Analýza aktuálního stavu Kalendáře (Krok 1)

1. **Server fetch** (`src/app/[locale]/(dashboard)/calendar/page.tsx`): query čte `.from("posts").select("*, post_platforms(*), post_tags(tags(id, name, color))")` – **žádný dotaz na analytics tabulku**. Na kalendáři se nezobrazují žádné metriky.
2. **Client komponenty** (`_calendar-view.tsx` → `PostCalendarChip` v `src/components/calendar/post-calendar-chip.tsx`): čip zobrazuje jen ikony platform (+ status check/X badge), čas, zkrácený obsah, status styling. `StatsCards` počítá jen počty postů dle statusu (bez analytics).
3. **Srovnání s Analytics stránkou (Krok 4A/4B):** Analytics stránka čte `analytics` `.in("post_id", postIds)` + `.gte("recorded_at", cutoff)` a agreguje přes `postsWithAnalytics`/`totals` (reduce sum `impressions`, `engagements`, ...). Drill-down `analyticsByTarget` (Map klíčovaná `post_platform_id`) + `targetsByPost`.
4. **Ověření agregace přes multi-target posty:** ✅ **Agregace na Analytics stránce je SPRÁVNÁ.** Migrace 060 (`analytics_post_id_unique` DROP) + 061 (`post_platform_id NOT NULL`) dělají z `analytics` **snapshot per `post_platform_id` s `UNIQUE(post_platform_id)`** (1 řádek = 1 platforma; upsert `onConflict: post_platform_id` v `analytics/actions.ts`). Není to time-series → součet řádků multi-target postu NEdvojnásobí data. Post FB+IG = 2 řádky → součet = celkový počet interakcí. **Žádná oprava agregace není potřeba** – Kalendář má jen ZOPAKOVAT stejný vzor (fetch + reduce po `post_id`).
5. **Typ `Post`** (`src/types/calendar.ts`): nemá pole pro analytiku → nutno rozšířit.

### Dílčí kroky (pořadí)

- [ ] **KROK 1 – Analýza → tento plán** (zapsáno výše, žádný kód).
- [x] **KROK 2 – Server-side fetch + agregace analytiky na Kalendář** ✅ (2026-09-19, implementace + `npx tsc --noEmit` 0 chyb; manuál test až se společným review s KROKEM 3):
  - `calendar/page.tsx`: po fetch `posts` nasbírán `postIds`, fetch `analytics` `.in("post_id", postIds)` (bez period filtru – kalendář zobrazuje aktuální stav snapshotu; tabulka je per-target UNIQUE, není time-series).
  - Agregace: `Map<post_id, { impressions, engagements }>` reduce **SUM přes řádky** (každý řádek = 1 platforma; FB+IG → součet). Edge: post bez analytics řádku (draft/scheduled) → `undefined` = bez badge.
  - Rozšířen typ `Post` v `src/types/calendar.ts` o `analytics?: { impressions: number; engagements: number }`; agregace přiřazena k postu v `map` (protéká přes `_calendar-client` → `_calendar-view` automaticky).
- [x] **KROK 3 – UI: badge interakcí na kartě postu (v rámci 20px radiusu)** ✅ (2026-09-19, otestováno + build):
  - `post-calendar-chip.tsx`: pro posty se statusem `published` a `engagements > 0` kompaktní badge – ikona `Heart` + krácené číslo (`formatCompactNumber`), `ml-auto` doprava, jemné muted barvy.
  - `hover-preview.tsx`: pro published se `analytics` řádek `Eye` (dosah) + `Heart` (interakce) – konzistentní s Analytics stránkou.
  - Draft/scheduled posty bez analytiky → bez badge. i18n: bez nových klíčů (číselný badge).
- [x] **ROZŠÍŘENÍ – Posts stránka (/prispevky)** ✅ (2026-09-19, otestováno + build): stejný vizuální prvek na kartě postu – jemná pilulka `Eye` (dosah) + `Heart` (interakce) **v patičce karty** (datum vlevo, metriky vpravo `ml-auto`; původní umístění v hlavičce za statusem kolidovalo s hover ikonami → přesunuto). Podmínka `published` + `analytics`. Sdílený fetch helper `src/lib/analytics-summary.ts` (`fetchAnalyticsByPost`, single source of truth – použit i Kalendářem, žádná duplikace), `formatCompactNumber` přesunut do `src/lib/format.ts` (re-export z calendar chip), analytics připojen ve všech 3 projections Posts (`page.tsx`, `fetchMorePosts`, `fetchFilteredPosts`).
- **Ověření každého kroku:** `npx tsc --noEmit` + manuál test v prohlížeči.

---

## 🔶 FÁZE 2: LinkedIn Analytics (čeká na LinkedIn Community Management API schválení)

> **Stav (2026-09-16):** LinkedIn schvaluje produkt "Community Management API" mimo appku. Zatím čekáme. Tato fáze obsahuje PŘÍPRAVNÉ KROKY, které nevyžadují funkční analytics endpoint – jsou připravené k rychlému zapnutí, jakmile se scope schválení dočká.
> **ŽÁDNÝ kód, který změní OAuth flow nebo přidá `r_member_postAnalytics` scope naostro, dokud LinkedIn schválení nedorazí.**

### Analýza – Současný stav LinkedIn OAuth flow (2026-09-16)

#### 1. Kde se definuje scope list

- **Soubor:** `src/app/api/accounts/linkedin/route.ts`, řádky 72-74
- **Aktuální scope string:** `"openid profile email w_member_social"`
- **Komentář v řádcích 66-71:** `r_member_social` je **záměrně vynechán** – LinkedIn developer app ho nemá schválený, a přidání ho způsobí `unauthorized_scope_error` (celý OAuth request selže ještě před consent screen)
- **Toto je JEDINÉ místo** v kódu, kde se LinkedIn scope definuje (callback route ho nemá)

#### 2. Jaké scopes appka dnes žádá

| Scope | Účel | Status |
|---|---|---|
| `openid` | OIDC identita | ✅ Vyžadován |
| `profile` | Uživatelský profil | ✅ Vyžadován |
| `email` | E-mail | ✅ Vyžadován |
| `w_member_social` | Publikování (write) | ✅ Vyžadován |
| `r_member_postAnalytics` | Čtení member post analytics | ❌ Čeká na LinkedIn schválení CM API |

#### 3. Kde se ukládá LinkedIn token

Tabulka `social_accounts`:
- `access_token` (TEXT) – hlavní token
- `metadata.refresh_token` (JSONB) – refresh token uložen v `metadata.refresh_token`
- `token_expires_at` (TIMESTAMPTZ) – 60 dní od připojení
- **Žádný sloupec `scopes` neexistuje** (žádná migrace ho nepřidala)
- Typy v `src/lib/supabase/types.ts` (řádk 134-174): `Row` nemá `scopes`

#### 4. Mechanismus detekce "chybí scope" vs "token vypršel"

| Typ problému | Jak se detekuje | Kde |
|---|---|---|
| Token vypršel | `token_expires_at` + buffer 24h | `publish-linkedin.ts` → `getValidLinkedInAccessToken()` |
| Chybí scope | **ŽÁDNÝ** – kód se o scopes nezajímá | – |

**Důležitá historie – rozlišení dvou rozdílných scope (2026-09-16):**

⚠️ **NEMÍŠTĚT:** `r_member_social` ≠ `r_member_postAnalytics`

- **`r_member_social`** (čtení member posts/shares) – byl v kódu jednou přidán, pak **odebrán** (2026-08), protože LinkedIn developer app ho neměl schválený. Žádný existující token ho v praxi nezískal. Patří do **historie**, nemá se řešit v této fázi.
- **`r_member_postAnalytics`** (čtení member post analytics – impressions, engagement) – je cílem FÁZE 2. Patří pod produkt **"Community Management API"**, na jehož schválení momentálně čekáme. Tento scope ještě nikdy nebyl v kódu požadován.

Tento rozlišování je klíčové: historický problém s `r_member_social` se netýká `r_member_postAnalytics`, protože jde o rozdílné scope pod odlišnými produkty.

---

### Návrh kroků (pořadí, čeká na schválení)

#### KROK A – Příprava DB migrace (SQL návrh) ✅ migrace APLIKOVANÁ na produkci

**Cíl:** Přidat sloupec pro ukládání scope listu u LinkedIn účtů.

**Migrace:** `supabase/migrations/062_social_accounts_scope_list.sql` – **aplokáno na produkční DB 2026-09-17** (potvrzeno: sloupec `scope_list` TEXT[] nullable existuje). Soubor je versionovaný v gitu (součást PR).

**Návrh migrace** (obsah souboru):
```sql
-- Přidá sloupec scope_list (TEXT[]) do social_accounts
-- DEFAULT NULL: existující účty (připojené předtím) dostanou NULL = "scope neznámo"
-- Žádný index: tabulka social_accounts je malá, GIN by byl zbytečná režie.
ALTER TABLE social_accounts ADD COLUMN scope_list TEXT[] DEFAULT NULL;
```

**Typy (✅ hotové):** `scope_list: string[] | null` doplněno do `src/lib/supabase/types.ts` (Row/Insert/Update) – čistě typová definice na klientské straně, nic nespouští; připravuje kód pro KROK B/C.

**Přístup A (doporučený):** `TEXT[]` array, neboť to nejbližší odpovídá tomu, co LinkedIn vrací (seznam scope).
- Nový účet → scope se uloží při OAuth (`['w_member_social', 'r_member_postAnalytics', 'openid', 'profile', 'email']`)
- Legacy účet → `NULL` → appka považuje za "scope neznámo" (nebudeme rušit stávající uživatele)

**Způsob použití:**
- `scope_list @> ARRAY['r_member_postAnalytics']` → účet má tento scope
- `scope_list IS NULL` → účet připojen před tím, než se scope začalo sledovat

#### KROK B – UI banner na Accounts stránce ✅ implementováno (čeká na data)

**Cíl:** Pro LinkedIn účty bez `r_member_postAnalytics` zobrazit upozornění.

**Implementace (2026-09-17):**
- Banner je inline blok v `src/app/[locale]/(dashboard)/accounts/page.tsx`, uvnitř map aktivních účtů, **hned za existující expired/expiring token varováními** (řádky ~935-947). Kompaktný přesměrovací řádek: ikona `Lock` (lucide) + text + tlačítko Reconnect (`size="sm"`, variant ghost).
- **Podmínka zobrazení (explicitně):**
  ```
  account.platform === "linkedin"
  && account.scope_list != null            // NULL = legacy = NEzobrazit
  && !account.scope_list.includes("r_member_postAnalytics")  // pole bez scope = zobrazit
  ```
  Pozor na `!=` (loose) – kontroluje i `undefined` i `null`; `!==` by prošlo `undefined` dál k `.includes()` (JS semantics).
- **Tlačítko Reconnect** – ŽÁDNÝ nový flow: využuje existující `handleReconnect(account.platform as PlatformId)` → connect modal → `/api/accounts/linkedin` **se stávajúcím scope stringem** (`openid profile email w_member_social`). Scope string se mění až v KROKU D.
- **Server data flow (nutný):** `src/app/api/accounts/route.ts` – `scope_list` doplněn do `.select(...)` GET listy + typ `SocialAccountRow` + `sanitizeSocialAccount` (scope list není citlivá data, předá se raw, na rozdíl od `metadata` kde se stírají access/refresh tokeny). Typ `SocialAccount` v page.tsx má `scope_list?: string[] | null`.
- **i18n:** nový klíč `scopeReconnectPrompt` v accounts sekci (cs/en/uk) + reuse existujícího `reconnect`.
- **Ověření:** `npx tsc --noEmit` ✅ (0 chyb). JSON parses v 3 localech, key-tree identický. **Banner se dnes NIKDE nezobrazí** – `scope_list` je u všech účtů `NULL` (sloupec/typ připravené, ale scope se nikde neukládá) → podmínka `!= null` je false → správně, ověřeno staticky.

#### KROK C – Ukládání scope do DB (příprava) ✅ implementováno, čeká na KROK D k aktivaci

**Cíl:** Připravit kód pro ukládání `scope_list` při OAuth connectu.

**Implementace (2026-09-17):**
- **`src/app/api/accounts/linkedin/route.ts`:** nová konstanta `TARGET_SCOPES = ["openid", "profile", "email", "w_member_social"]` (single source of truth) – authorize URL i autoritativní zdroj pro `scope_list`. Hardcoded scope string v authorize URL nahrazen `TARGET_SCOPES.join(" ")` (stejný výsledek, identické OAuth chování).
- **Upsert:** doplněn `scope_list` — uloží se **POUZE** když `TARGET_SCOPES` obsahuje `r_member_postAnalytics` (KROK D gate). Dnes = `NULL` → banner tichý, žádná změna OAuth. Po přidání do TARGET_SCOPES v KROKU D se ukládání zapne automaticky.
- **`src/lib/scope-utils.ts` (nový):** dva helpery – `hasScope(scopeList, scope)` (NULL/undefined → `false`, bez pádu na `.includes()`; použit v gate v route) a **`needsReconnect(scopeList, scope)`** (použit v banneru `page.tsx`).
- 🐛 **Bugfix banneru (2026-09-17):** původní `!hasScope(...)` sloučil dva případy – „nevíme" (NULL legacy → `false` z hasScope → `!false` = `true` = banner se ZOBRAZIL) a „víme, že nemá" → banner se chybně zobrazil i u legacy účtu (Kateřina Nyklová). **`needsReconnect`** vrací `true` POUZE pro ne-null pole bez scope; NULL/undefined („scope neznámo") → `false` (neobtěžovat). Rozlišení „nevíme" vs „víme, že nemá" je tím zachováno.
- **Soulad s rozlišením:** `r_member_social` se NIKDY nevyžaduje (viz historie); `r_member_postAnalytics` je v KROKU D, čeká na LinkedIn CM API schválení.

**Ověření:** `npx tsc --noEmit` ✅ (0 chyb). Banner se dnes nikde nezobrazuje (všichni účty mají `scope_list = NULL` → `needsReconnect` = `false`).

#### KROK D – Přidání `r_member_postAnalytics` do scope stringu

**Cíl:** Jakmile LinkedIn schválení projde (produkt "Community Management API" je schválen), změnit scope string v `route.ts`.

**Změna:**
```ts
// Teď:
scope = "openid profile email w_member_social"
// Po LinkedIn schválení:
scope = "openid profile email w_member_social r_member_postAnalytics"
```

**Toto je JEDNOZNACHRY (single-line) změna**, ale může ji provést jen když:
1. LinkedIn Developer Portal ukazuje, že produkt "Community Management API" je schválen pro naší app
2. Ověříme, že `r_member_postAnalytics` nezpůsobí `unauthorized_scope_error`

**TESTOVACÍ POSTUP:**
1. Změnit scope string lokálně
2. Odpojit a znovu připojit LinkedIn účet
3. Ověřit, že `scope_list` se uloží do DB
4. Ověřit, že banner na `/accounts` se správně zobrazuje/hide

#### KROK E – Analytics stránka – funkční závislost

**Poznámka:** Toto závisí na tom, jak analytics pro LinkedIn funguje. Pokud analytics čte data z endpointu, který vyžaduje `r_member_postAnalytics` → KROK D musí být hotový. Pokud analytics čte data jinak (např. z cron-sync které už běží a ukládá analytics do DB) → KROK D nemusí být nutný pro zobrazení.

---

### Ověření (po dokončení všech kroků)

- `npx tsc --noEmit` ✅
- LinkedIn OAuth reconnect funguje s novým scope
- `scope_list` se ukládá do `social_accounts`
- Banner se zobrazuje u účtů bez `r_member_postAnalytics`, skrývá se u účtů s ním
- Analytics data se načítají

### Pravidla pro práci s touto fází

1. **ŽÁDNÁ změna `r_member_postAnalytics` scope naostro** dokud LinkedIn schválení nedorazí
2. **KROK A a B lze připravit** (SQL soubor + UI komponenta), ale NEPUSOBCAT na produkci
3. **Rozlišovat** `r_member_social` (historický, vypuštěn) od `r_member_postAnalytics` (cíl této fáze)
4. **Před každým krokem** zkontrolovat, zda se nezměnila situace na LinkedIn stránce
5. Pokud se zdržujeme >1 týden bez pokroku → upozornit uživatele v chatu

