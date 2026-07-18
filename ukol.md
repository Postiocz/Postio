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

### ÚKOL: Doplnění identifikačních údajů provozovatele do právních dokumentů (cs/en/uk)

**Cíl:** Doplnit identifikační údaje OSVČ do 4 právních dokumentů ve všech 3 jazykových mutacích (celkem 12 souborů).

**Údaje k doplnění (OSVČ):**
- Jméno: Václav Nykl
- IČO: 74260138
- Sídlo: Sokolská 464/27, Nové Město, 12000 Praha 2, Česko

**Poznámka k formátování:** Těla cs dokumentů jsou psána BEZ diakritiky (např. „Spravce", „Provozovatel"). U vlastního jména „Václav Nykl" a adresy „Sokolská" diakritiku ponechám (vlastní jména), zbytek popisků sladím se stylem daného souboru. EN/UK verze v odpovídajícím jazyce a přepisu.

**Kroky:**

- [x] ✅ **Krok 1 – CS mutace (doc/cs, 4 soubory):** HOTOVO. Pozn.: uživatel poté ručně opraví diakritiku/spisovnost v cs textech a přepíše soubory; Claude následně zkontroluje formátování/zarovnání před Krokem 2.
  - `01_...Zasady...txt` → sekce 2 „SPRÁVCE" (ř. 21): doplnit Jméno, IČO, Sídlo za řádek „Spravce".
  - `02_...Obchodni_podminky.txt` → bod 1.1 (ř. 15): doplnit identifikaci provozovatele (Václav Nykl, IČO, sídlo).
  - `03_...DPA.txt` → bod 1.1 (ř. 15): doplnit identifikaci Zpracovatele.
  - `04_...AI.txt` → bod 1 ÚVOD (ř. 15): doplnit jméno/firmu do úvodního odstavce.

- [ ] **Krok 2 – EN mutace (doc/en, 4 soubory):**
  - Stejná místa jako CS. Terminologie: „ID Number" (IČO), „Registered Office" (sídlo). Adresa v EN přepisu.
  - `01` sekce 2 „DATA CONTROLLER" (ř. 20); `02` bod 1.1 (ř. 14); `03` bod 1.1 (ř. 14); `04` bod 1 INTRODUCTION (ř. 14).

- [ ] **Krok 3 – UK mutace (doc/uk, 4 soubory):**
  - Stejná místa. Terminologie UK: „Ідентифікаційний номер" (IČO), „Юридична адреса" (sídlo).
  - `01` sekce 2 „КОНТРОЛЕР" (ř. 19); `02` bod 1.1 (ř. 13); `03` bod 1.1 (ř. 13); `04` bod 1 ВСТУП (ř. 13).

- [ ] **Krok 4 – Diff a potvrzení:** Zobrazit `git diff` všech 12 souborů uživateli k potvrzení.



