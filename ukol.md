# Postio – Pracovní plány

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ:**
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceme začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování):**
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceme pokračovat. Nikdy nedělej více kroků najednou!

3. **TESTOVÁNÍ PŘED ZÁPISEM:**
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

4. **GIT COMMIT (Automaticky po splnění Pravidla 3 – „TESTOVÁNÍ PŘED ZÁPISEM"):**
   Poznámka: „Krok 3" v tomto pravidle znamená **Pravidlo 3 (TESTOVÁNÍ PŘED ZÁPISEM)**, nikoliv krok úkolu č. 3. Jakmile je pro některý krok splněno Pravidlo 3 – tj. uživatel výslovně potvrdí manuální otestování a krok je označen ✅ v `ukol.md` + zapsán do `CHANGELOG.md` –, **automaticky sám provedeš `git add` + `git commit`** aktuálního stavu. Tím se trvale zachová i případný záznam, který v budoucnu propadne prořezáním `CHANGELOG.md` (Pravidlo 6) – historie zůstává v Gitu a nic se neztratí. Po commitu se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** – ten dělá výhradně uživatel sám.

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ:**
   Pracujeme s lokálním modelem a máme tvrdý limit kontextového okna. Pro ochranu před přehlcením paměti:
   - Buď ve svých odpovědích maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jen jednu funkci – používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutně nutné.

6. **AUTOMATICKÉ PROŘEZÁVÁNÍ CHANGELOGU (Zero-Token Auto-Drop):**
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 3) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, ten úplně nejstarší záznam ze dna `CHANGELOG.md` JEDNODUŠE SMAŽ (odstraň ze souboru). Žádný archivní soubor neotevírej, nečti ani nevytvářej – stará historie zůstává trvale v Gitu (zachráněna committem v Kroku 4) a my tímto šetříme 100 % kontextových tokenů pro programování.

7. **MAZÁNÍ KOMPLETNĚ HOTOVÝCH ÚKOLŮ:**
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden poslední`git commit` (Pravidlo 4), u posledního krokuz Aktuálních úkolů, tak smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce) a nadpis ## 10. AKTUÁLNÍ ÚKOLY". Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLU (Taste Skill):**
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
    1. .agents/skills/design-taste-frontend/SKILL.md
    2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL:**
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"**

---

## 10. AKTUÁLNÍ ÚKOLY

### 📋 Prompt 028 (Sjednocení výběru účtů na stránce Nový příspěvek)

**Cíl:** Stránka pro vytvoření nového příspěvku (`src/app/[locale]/(dashboard)/posts/new/page.tsx`)
stále používá starý výběr obecných platforem (stav `selectedPlatforms`, textové chips bez účtů).
Cílem je sjednotit ji s `EditPostDialog` (Prompt 027 Krok 3), aby výběr účtů vypadal a fungoval
identicky – včetně výběru konkrétního účtu (i 2× Facebook Page).

**Poznámka k označení:** Číslo „Prompt 028" už v `CHANGELOG.md` figuruje pro jiný, dokončený úkol
(PreviewDialog z Dashboardu + TikTok soft-delete). Tento nový úkol sdílí stejné označení – při
zápisu do CHANGELOGu po dokončení zvážit přejmenování (např. Prompt 029), aby nedošlo ke kolizi.

**Kontext z analýzy (FÁZE 1):**
- Nová stránka: stav `selectedPlatforms: string[]`, statické `PLATFORMS` (6 položek), `togglePlatform`,
  UI = textové `rounded-full` chips s názvem sítě (žádné avatary/účty). Média-gating: `isPlatformMediaRequirementMet`
  + `getPlatformRequirementTooltip` (per platforma). Po odstranění média `handleRemoveMedia` AUTO-ODEBÍRÁ
  vybranou platformu.
- `EditPostDialog` (vzor): stav `selectedAccountIds: string[]` + `allAccounts: AccountInfo[]`
  (načteno z `GET /api/accounts`), `selectedPlatforms` je ODVOZENÝ memo (zpětná kompatibilita),
  `toggleAccount(id)`, UI = grid skupin dle sítě, v každé skupině čipy účtů (ikona sítě + avatar + jméno),
  disabled když media-requirement nesplněn (s tooltipem). `handleRemoveMedia` AUTO-ODEBÍRÁ účty
  (přes `selectedAccountIds`), jejichž platforma requirement ztratila – stejná logika jako nová stránka,
  jen na `account_id`.
- Backend `createPostAction` (`src/lib/actions/posts.ts`, řádky ~95-110) už plně podporuje `accountIds`:
  dle `account_id` lookupne `platform` a zapíše `account_id` do `post_platforms`. Krok 3 plánu je tedy
  na backendu hotový – stačí poslat `accountIds` místo `platforms`.
- Sdílený `PlatformIconMap` existuje v `src/components/calendar/post-calendar-chip.tsx` (a lokálně v edit-post-dialog).

---

#### [x] Krok 1 — Synchronizace logiky (stav + načítání účtů)
- **Soubory:** `src/app/[locale]/(dashboard)/posts/new/page.tsx`.
- **Akce:**
  1. Přidat stavy `selectedAccountIds: string[]` a `allAccounts: AccountInfo[]` (`AccountInfo = {id, platform, account_name, avatar_url}`).
  2. Přidat `useEffect`, který po mountu/získání `userId` volá `fetch("/api/accounts")` a naplní `allAccounts` (zrcadlo edit-post-dialog řádky ~277-295).
  3. Změnit `selectedPlatforms` ze stavu na odvozený `useMemo` z `selectedAccountIds` + `allAccounts` (kopie z edit-post-dialog řádky ~354-363) – zachová `isInstagramVideoIncompatible` a disabled tlačítka.
  4. Přidat `toggleAccount(id)` (zrcadlo edit-post-dialog řádky ~767) místo `togglePlatform`.
  5. Ponechat `PLATFORMS` (labely + media-gating); přidat `PlatformIconMap` (import ze sdíleného `post-calendar-chip.tsx` nebo lokální kopie dle edit-post-dialog).
- **Ověření:** `npx tsc --noEmit`.

#### [x] Krok 2 — Přenesení UI (account-picker čipy)
- **Soubory:** `src/app/[locale]/(dashboard)/posts/new/page.tsx`.
- **Akce:** Nahradit blok „Platform selection" (řádky ~706-767) za account-picker ze `EditPostDialog` (řádky ~2077-2215):
  - Empty state (`allAccounts.length === 0`): info + tlačítko „Připojit účet" (`t("noConnectedAccounts")`, `t("connectAccount")`).
  - Jinak grid `grid-cols-2 md:grid-cols-3 gap-3`, seskupeno dle `platform` (`reduce`), každá skupina: hlavička (ikona sítě + název) + flex-wrap čipy účtů.
  - Čip: `rounded-full border px-2 py-0.5 text-[11px]`, avatar (`<img>`) nebo iniciála, jméno (`truncate`), selected = indigo, disabled = `opacity-40 cursor-not-allowed` + `Tooltip` (proč media nesplněna).
  - Zkopírovat přesně Tailwind třídy z `EditPostDialog` pro 100% vizuální shodu.
  - **Pravidlo 8:** před úpravou načíst `.agents/skills/design-taste-frontend/SKILL.md` + `.agents/skills/high-end-visual-design/SKILL.md` a dodržet (Premium Glassmorphism, radius 20px, indigo akcenty).
- **Ověření:** `npx tsc --noEmit`, vizuální test v prohlížeči (shoda s `EditPostDialog`).

#### [ ] Krok 3 — Ukládání (createPostAction dostává `accountIds`)
- **Soubory:** `src/app/[locale]/(dashboard)/posts/new/page.tsx`.
- **Akce:** Ve všech 3 submit handlerech (`handleSubmit`, `handlePublishNow`, `handleQueueToSchedule`) změnit
  `createPostAction({ ..., platforms: selectedPlatforms, ... })` na `accountIds: selectedAccountIds`
  (a `platforms` už neposílat, popř. prázdné pole). Backend `accountIds` už zpracovává.
  - `handlePublishNow` i `handleQueueToSchedule`: kontrola `selectedPlatforms.length === 0` → `selectedAccountIds.length === 0`.
  - `newPostHint` (řádek ~910) a disabled tlačítek (`selectedPlatforms.length === 0`) → `selectedAccountIds.length === 0`.
  - `handleRemoveMedia` (řádky ~197-209): přepsat z odebírání platforem na odebírání `selectedAccountIds`
    dle platformy (zrcadlo edit-post-dialog řádky ~396-410) – zachovat auto-odebírání při smazání média.
- **Ověření:** `npx tsc --noEmit`, manuální test vytvoření příspěvku s výběrem konkrétního účtu (i 2× FB).

#### [ ] Krok 4 — Design & Taste + finální cleanup
- **Soubory:** `src/app/[locale]/(dashboard)/posts/new/page.tsx`, příp. `src/messages/{cs,en,uk}.json`.
- **Akce:**
  - Dodržet design manuály (Pravidlo 8) – ověřit radius 20px, glassmorphism, indigo akcenty, grid spacing shodný s `EditPostDialog`.
  - Vyčistit mrtvý kód po refaktoru: odstranit starý stav `selectedPlatforms` (pokud přebytečný), `togglePlatform`, nepoužité importy/`PLATFORMS` labely.
  - Ověřit existenci překladů pro empty state (`noConnectedAccounts`, `connectAccount` – z Kroku 3 Promptu 027 existují; jen zkontrolovat).
- **Ověření:** `npx tsc --noEmit`, manuální test v prohlížeči (prázdný stav bez účtů, 2× FB, media-gating, publikování/naplánování).

