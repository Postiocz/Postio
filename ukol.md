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
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden `git commit` (Pravidlo 4), smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce). Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLU (Taste Skill):**
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
    1. .agents/skills/design-taste-frontend/SKILL.md
    2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL:**
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"**

 ---

## 10. AKTUÁLNÍ ÚKOLY

### 📋 Prompt 027 (Úklid + plná podpora více firemních účtů)

**Cíl:** Kompletně zrušit funkci „Osobní profil / Manuální publikování" (nefunguje – Meta API
osobní profily nepublikuje). Postio se stává čistě profesionálním nástrojem pro AUTOMATICKÉ
publikování na firemní účty (Facebook/Instagram Pages, atd.). Zároveň dobudovat plnou podporu
více účtů téže sítě (např. 2× Facebook Page) přes existující sloupec `account_id` + FK.

**Důležité – DB:** Sloupec `post_platforms.account_id` (UUID, FK na `social_accounts.id`) a jeho
migrace (037) ZŮSTÁVAJÍ. Je to základ, aby jedna síť mohla mít více propojených účtů a publish
motor cílil přesně na vybranou Stránku. Pojem `publishing_type` / stav `'ready'` už dále
nepoužíváme (logika se odstraňuje, sloupec v DB může zůstat jako unused, nebo se později odebere).

---

#### [x] Krok 1 — Odstranění manuální logiky
- **Soubory:** `src/lib/actions/publish.ts`, `supabase/functions/process-scheduled-posts/index.ts`,
  `src/app/[locale]/(dashboard)/dashboard/page.tsx` (ManualPublishWidget + dotazy na `status='ready'`
  a `publishing_type='manual'`), `src/components/edit-post-dialog.tsx` (`publishingTypeMap` /
  `PublishingTypeBadge`), `src/components/connect-account-modal.tsx` (`showProfileChoice`).
- **Akce:** Ze všech souborů odstraň logiku `manual` vs `direct` – proměnné, větve, helpery
  `getAccountPublishingType` / `markManualReady`, stav `'ready'`, 🔔 badge, „Připraveno k ručnímu
  zveřejnění" widget. Vše je nyní vždy `'direct'` (automatické publikování).
- **Ověření:** `npx tsc --noEmit`.

#### [x] Krok 2 — Zjednodušení připojování (žádný výběr profilu)
- **Soubory:** `src/components/connect-account-modal.tsx`, `src/app/[locale]/(dashboard)/accounts/page.tsx`.
- **Akce:** Zruš modál výběru „Professional vs Personal". Kliknutí na ikonu sítě v sekci Účty rovnou
  spouští OAuth proces pro firemní účet (stávající `onConnect('direct')` cesta, bez `showProfileChoice`
  a bez předání `publishing_type`).
- **Ověření:** `npx tsc --noEmit`, manuální test připojení v prohlížeči.

#### [x] Krok 3 — Plná podpora více účtů v Editoru (hlavní cíl)
- **Soubory:** `src/components/edit-post-dialog.tsx` (+ načtení účtů z `social_accounts` s `account_id`,
  `account_name`, `avatar_url`).
- **Akce:** Přepiš výběr platforem tak, aby editor zobrazoval VŠECHNY připojené účty seskupené dle
  sítě. Má-li uživatel 2 Facebook Pages, uvidí 2 ikony Facebooku (každou s vlastním avatarem a jménem)
  a může vybrat jednu, obě, nebo žádnou. Výběr se uloží do `post_platforms.account_id` (jeden řádek
  `post_platforms` na každý zvolený účet).
- **Ověření:** `npx tsc --noEmit`, vizuální + funkční test (2× FB, výběr/odškrtnutí).

#### [x] Krok 4 — Oprava odesílacího motoru (target `account_id`)
- **Soubory:** `src/lib/actions/publish.ts`, `supabase/functions/process-scheduled-posts/index.ts`.
- **Akce:** Ujisti se, že publish motor používá `account_id` k přesnému zacílení na vybranou Stránku
  (helpery `resolveTargetAccount` atd. už `account_id` berou). Odstraň zbylé
  `.ilike("platform", X).limit(1)` fallbacky, kde to dává smysl, a zajisti, že počet publikací
  odpovídá počtu zvolených účtů (ne jen jedna platforma).
- **Ověření:** `npx tsc --noEmit`, manuální test publikování na konkrétní účet (i na 2× FB).

#### [x] Krok 5 — Lokalizace a finální cleanup
- **Soubory:** `src/messages/{cs,en,uk}.json`.
- **Akce:** Odstranit nepoužívané klíče (profileChoice*, manualPublish*, connectModal.manual* a
  další z Kroku 1). Zachovat klíče pro výběr účtů (Krok 3) a případně přidat nové pro více účtů.
- **Ověření:** `npx tsc --noEmit`, kontrola překladů ve všech 3 jazycích.
