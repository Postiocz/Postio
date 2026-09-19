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

### 🐛 ÚKOL: FB Preview přetéká přes okraje karty (editor náhledu) ✅

- **Kontext (2026-09-13):** V editoru postu (Preview panel) má Facebook záložka vizuální bug – obrázek/podklad přetéká přes zaoblené okraje karty náhledu (hrany fotky nesou zarovnané s `rounded` rohy karty), na rozdíl od Instagram záložky, která je v pořádku.
- **Analýza:** komponenta `post-preview.tsx` – `MediaArea` (r. 812) má `overflow-hidden` ale bez `border-radius`; FB article (r. 864) má `rounded-lg` ale bez `overflow-hidden` → ostré rohy media přetékajу mimo zooblené rohy karty. IG je v pořádku, protože media leží flush k vnější karte viewportu (`rounded-[20px] overflow-hidden`, r. 244).
- **Oprava (✅ testováno):** FB media wrappovaná v `overflow-hidden rounded-lg`; LinkedIn media (`rounded-lg` article) dostala `rounded-lg` na wrapper (stejný latentní bug). Diff: post-preview.tsx r. 891 + r. 1153.

### 🐛 ÚKOL v2: FB/LinkedIn Preview – portrétový obrázek s tmavým okrajem (letterboxing) ⏳

- **Kontext (2026-09-13):** Po opravě přetékání vizuální test ukázal: kolem portrétového obrázku v FB a LinkedIn náhledu je viditelný nechtěný tmavý okraj/pruh po stranách – obrázek nevyplňuje šířku karty tak, jak na reálné síti. IG tab je v pořádku.
- **Analýza:** řešit – jak se řeší object-fit / šířka kontejnera pro portrétové obrázky (`w-full h-auto object-contain` v MediaArea vs IG). Potenciální příčina: `object-contain` litychní + kontejner bez aspekt-ratio → při portrétu vzniká letterbox. Zhoduj s IG.
- **Oprava:** navrhni (needituj kód, dokud neschválím).

### 🎯 ÚKOL: Jednotná per-platform validace médií (všech 6 platforem)

**Problém / stav 2026-09-13:** Validace médií je dnes fragmentovaná a platforma-specifická (neexistuje vlastně, mimo dvou obecných checků):

- Obecná MIME allow-list (JPEG/PNG/WEBP image, MP4/MOV video) v `src/lib/constants.ts`, aplikovaná při přidání souboru v `src/hooks/use-media-upload.ts` (`addFiles`).
- Obecná velikostová ochrana: `MAX_VIDEO_SIZE` 50 MB, `ABSOLUTE_HARD_LIMIT` 50 MB (tamté).
- Obecné varování nízkého rozlišení video: `MIN_VIDEO_DIMENSION = 640` (toast `videoLowResolution`).
- IG-specific: `getInstagramIncompatibleVideos` (video s kratší stranou <640 px) → rose banner + disable Publish/Schedule v obou editorach (`posts/new/page.tsx`, `components/edit-post-dialog.tsx`).
- Platform-vyžadující checky presence: `isPlatformMediaRequirementMet` (tiktok/youtube → video, instagram → jakékoli médium), tooltipy.

**⚠️ DŮLEŽITÉ ZJIŠTĚNÍ:** Pravidlo „IG = JPEG-only + poměr stran 4:5–1.91:1" existuje JEN v CLAUDE.md/AGENTS.md (`## 📱 Sociální sítě – UI/UX & API pravidla`, bod 2 „Validace médií"). **V KÓDU TU VALIDACI NENÍ ANI IMPLEMENTOVANÁ** — žiaden kód nekontroluje formát/poměr obrazu per-platform.

**Oficiální požadavka (ověřeno z dokumentace 2026-09-13):**

| Platforma | Format obrázků | Max velikost obr. | Poměr obrázků | Format videí | Max délka videí | Max velikost videí | Pozn. |
|---|---|---|---|---|---|---|---|
| Facebook | jpeg/bmp/png/gif/tiff | 10 MB (png doporuč. <1 MB) | — | MP4/MOV | do 240 min | 10 GB | Graph API Page Photos |
| Instagram | jpeg/png | 8 MB (organic) | feed 4:5·1:1·1.91:1; story 9:16 | MP4/MOV | 3 s–60 min (Reels 3 min) | 4 GB | feed ratio z CLAUDE.md 4:5–1.91:1 ✓ |
| LinkedIn | jpeg/gif/png | <36 MP px | 1:1 nebo 2.4:1 vid. | MP4/MOV/AVI/WebM/MKV | do 10 min | <200 MB (jedno; nad = multipart) | Assets API; v Postio v1 **video NEní podporované** (error) |
| YouTube | — | — | 16:9 default (4:3 kategori) | MP4/MOV/AVI/WMV/WebM… | do 12 h | 256 GB | Shorts 9:16/1:1 do 3 min |
| X (Twitter) | jpg/png/gif | 5 MB (gif 15 MB) | 16:9, 1:1 (+portrait 9:16) | MP4/MOV (H.264/AAC) | 0.5–140 s | 512 MB | X publish v Postio = „ready" (manual, bez API) |
| TikTok | jpg/png (photo) | — | 9:16 (i 1:1, 16:9) | MP4/MOV | do 3 min (10 min ze zdroje) | 72–278 MB (in-app) | min rez. 540×960 |

**Návrh obecného mechanismu:**

1. **Čistá per-platform politika** (`src/lib/media/platform-policies.ts`, pure TS, bez deps):
   ```
   type MediaPolicy = {
     platformId: string;
     requires: "image" | "video" | "any" | "none";
     allowedImageTypes: string[];   // MIME
     allowedVideoTypes: string[];
     maxImageBytes?: number;
     maxVideoBytes?: number;
     minRatio?: number;             // width/height
     maxRatio?: number;
     minDimension?: number;         // px, klatší strana
     maxDurationSec?: number;
     maxFiles?: number;             // počet médií na post
     notes?: string;                // i18n návrh
   };
   function validateMediaForPolicy(mediaItems, policy): ValidationIssue[];
   ```
   Registry pro všechny 6 + sdílená cnt funkce. Staré konstanty (`MIN_VIDEO_DIMENSION` a spol.) se přesunou sem jako výchozí/politiky.

2. **Klientová validacia sdílená** – jeden validator používaný OBA editora (posts/new + edit-post-dialog), místo dnešní IG-only logiky.

3. **UI štítek u KAŽDEJ vybranej platformy** – malý status odznak na chipu platformy (✓ zelený / ⚠ oranžový / ✕ červený) + tooltip s krátkým „čo nejsedí", plus místo IG-only banner: konsolidované varování s vypsanými všemi problémovými platformami.

4. **Server-side pre-flight** v `publish.ts` (a scheduled Edge Function) – dodržování pomocí stejných politik, skip + explicitní error pres silent-fail (stejný princip jako accountMap fix).

5. **i18n** – nové klíče per-platform (cs/en/uk); CHANGELOG záznam; aktualizace CLAUDE.md/AGENTS.md „Bibla pravidel" k markeru realizováno + shoda s realnou (JPEG-only nuance – IG akceptuje i PNG).

**Dílčí kroky (pořadě):**
- ✅ **KROK 1** – `platform-policies.ts` registry (všech 6 platforem) + validator fn (pure, názadno testovatelné). Bez UI.
- ✅ **KROK 2** – Zapojení validatoru do `posts/new` editoru: platform badge + tooltip + konsolidované varování (IG banner proho environment zamění obecný, ale zobrazuje se pro každou vybranou platformu).
- ✅ **KROK 3** – Stejné do `edit-post-dialog` (extrakce sdílené komponenty `PlatformMediaBadge` – `src/components/platform-media-badge.tsx`, používaná obojí editorom).
- ✅ **KROK 4** – Server-side pre-flight v `publish.ts` (+ poznámka pro scheduled Edge Function), skip + explicit error.
- **KROK 5** – i18n (cs/en/uk), CHANGELOG, aktualizace CLAUDE.md/AGENTS.md „Bibla pravidel".
- **Ověření každého kroku:** `npx tsc --noEmit` + manuál test v UI editoru.

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

