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

### 📋 Prompt 029 (Account-aware mazání příspěvků)

**Cíl:** `DeletePostDialog` (modál pro mazání příspěvku) volí cíl mazání podle PLATFOREM
(`selectedPlatforms`, text „Smazat z Facebook"). Po přechodu na account-based systém
(`post_platforms.account_id`) je tento modál nepoužitelný, pokud má uživatel více účtů
stejné sítě (2× Facebook Page) – `.find()` v `deleteFromMeta` trefí vždy jen první řádek.
Cílem je přepsat modál (i backend) na výběr konkrétních ÚČTŮ (avatar + jméno + ikona sítě).

**Poznámka k označení:** Číslo „Prompt 029" už v `CHANGELOG.md` figuruje pro jiný dokončený
úkol (Sjednocení výběru účtů na Nový příspěvek). Při zápisu do CHANGELOGu po dokončení
použít **Prompt 031** (029 i 030 jsou obsazené), aby nedošlo ke kolizi.

**Kontext z analýzy (FÁZE 1):**
- `src/components/dashboard/delete-post-dialog.tsx`: stav `selectedPlatforms: string[]`;
  refresh dotaz `post_platforms(platform, status, external_id)` – NEselectuje `account_id`,
  NEjoinuje `social_accounts`. UI renderuje checkboxy dle `platform` (`PLATFORM_NAMES[platform]`),
  `onConfirm(selectedPlatforms, deleteFromApp)`. `noApiPlatforms = [instagram, linkedin, tiktok]`.
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: `handleDeleteConfirm(selectedPlatforms, deleteFromApp)`
  iteruje `selectedPlatforms` a volá `deleteFromMeta({ postId, platform })`; `hasArchivedPlatform`
  = linkedin/instagram v `selectedPlatforms`. `PostPlatform` type (řádek 51) NEMÁ `account_id`.
  `DeletePostDialog` dostává `post.post_platforms` (bez `account_id`).
- `src/lib/actions/publish.ts` (`deleteFromMeta`, řádek 1571): najde cílový řádek přes
  `getPostPlatforms(post).find(r => r.platform === input.platform && r.status === "published")`.
  U 2× FB nejednoznačné. Větve instagram/linkedin/tiktok používají `input.platform`.
- `post_platforms.account_id` existuje v DB (FK na `social_accounts`, per CLAUDE.md).
- Další použití `deleteFromMeta`: jen `_post-card.tsx` (dialog). `[id]/page.tsx` importuje,
  ale volá s `platform` (pokud vůbec) → Krok 1 zachová `platform` fallback pro zpětnou kompatibilitu.

#### [x] Krok 1 — Backend: `deleteFromMeta` cílí na `account_id`
- **Soubory:** `src/lib/actions/publish.ts`.
- **Akce:**
  1. Rozšířit signaturu na `{ postId: string; platform?: string; accountId?: string }`.
  2. Centrální lookup cílového řádku: pokud `accountId` zadán → `r.account_id === accountId && r.status === "published"`; jinak původní `platform` fallback (zpětná kompatibilita, build zůstává zelený).
  3. `platform` pro větve instagram/linkedin/tiktok odvodit z nalezeného řádku (`row.platform`), ne z `input.platform`.
- **Ověření:** `npx tsc --noEmit`.

#### [x] Krok 2 — Typy + načítání účtů v dialogu
- **Soubory:** `src/app/[locale]/(dashboard)/posts/_post-card.tsx` (`PostPlatform` type), `src/components/dashboard/delete-post-dialog.tsx` (refresh dotaz).
- **Akce:**
  1. `PostPlatform` přidat `account_id: string | null`.
  2. V `delete-post-dialog.tsx` rozšířit refresh: `post_platforms(account_id, platform, status, external_id, social_accounts(account_name, avatar_url))`. Sestavit `publishedAccounts` = publikované řádky (`status='published' && external_id`) s `{ id: account_id, platform, name, avatar }`.
  3. Typ `post.post_platforms` rozšířit o `account_id` (+ account info z joinu).
- **Ověření:** `npx tsc --noEmit`.

#### [ ] Krok 3 — UI dialogu: checkboxy dle účtů
- **Soubory:** `src/components/dashboard/delete-post-dialog.tsx`.
- **Akce:**
  1. Stav `selectedPlatforms` → `selectedAccountIds: string[]` (init z `publishedAccounts`). `toggleAccount(id)`.
  2. UI: místo `selectablePlatforms.map(platform => ...)` renderovat `publishedAccounts.map(acc => ...)`: avatar (`<img>` nebo iniciála) + `acc.name` + ikona sítě (`PlatformIcon[acc.platform]`); text „Smazat z {acc.name}".
  3. `noApiPlatforms` badge dle `acc.platform` (instagram/linkedin/tiktok) – „Ruční smazání".
  4. Warning overlay: `selectedNoApiPlatforms` odvozen z platforem vybraných účtů.
  5. Description text upravit na account-aware (vyjmenovat účty/sítě).
  6. Zachovat „Trvale smazat z aplikace" (červené).
  7. **Pravidlo 8:** dialog už má `rounded-[24px]`, glassmorphism, indigo akcenty – zachovat stávající třídy.
- **Ověření:** `npx tsc --noEmit`, vizuální test (2× FB = 2 řádky s různými jmény).

#### [ ] Krok 4 — Propojení (`_post-card.tsx`)
- **Soubory:** `src/app/[locale]/(dashboard)/posts/_post-card.tsx`.
- **Akce:**
  1. `handleDeleteConfirm(selectedAccountIds, deleteFromApp)` (dialog posílá `accountIds`).
  2. Iterovat `for (const accountId of selectedAccountIds) await deleteFromMeta({ postId, accountId })`.
  3. `hasArchivedPlatform`: odvodit z platforem vybraných účtů přes `post.post_platforms.find(p => p.account_id === accountId)?.platform` (linkedin/instagram).
  4. Předat `post.post_platforms` (s `account_id`) do `DeletePostDialog` (už se předává).
- **Ověření:** `npx tsc --noEmit`, manuální test (2× FB – selektivní mazání jen z jednoho účtu, LinkedIn ruční, trvalé smazání z aplikace).

