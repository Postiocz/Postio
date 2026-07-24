# Postio – Pracovní plány

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ**:
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceme začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování)**:
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceme pokračovat. Nikdy nedělej více kroků najednou!

3. **TESTOVÁNÍ PŘED ZÁPISEM**:
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

4. **GIT COMMIT (Automaticky po Pravidle 7 – smazání úkolu)**:
   Jakmile je úkol kompletně hotový, test potvrzený (Pravidlo 3), zapsaný do `CHANGELOG.md` a sekce úkolu smazaná z `ukol.md` (Pravidlo 7), **automaticky provedeš `git add -A` a `git commit`** — tím se jedním commitem uloží všechny změny včetně smazání sekce z `ukol.md`. Po commitu se ujisti, že `git status` ukazuje **čistý working tree** ("nothing to commit, working tree clean"). Teprve pak se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** — ten dělá výhradně uživatel sám.

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ**:
   Pracujeme s lokálním modelem a máme tvrdý limit kontextového okna. Pro ochranu před přehlcením paměti:
   - Buď ve své odpovědi maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jednu funkci — používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutné.

6. **AUTOMATICKÉ PROŘEZÁVÁNÍ CHANGELOGU (Zero-Token Auto-Drop)**:
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 3) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, ten úplně nejstarší záznam ze dna `CHANGELOG.md` JEDNODUŠE SMAŽ (odstraň ze souboru). Žádný archivní soubor neotevírej, nečti ani nevytvářej — stará historie zůstane trvale v Gitu (zachráněna commitem v Kroku 4) a my tímto šetříme 100% kontextových tokenů pro programování.

7. **MAZÁNÍ KOMPLETNĚ HOTOVÝCH ÚKOLŮ**:
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden poslední `git commit` (Pravidlo 4), u posledního kroku z Aktuálních úkolů, tak smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce) a nadpis ## 10. AKTUÁLNÍ ÚKOLY. Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLŮ (Taste Skill)**:
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
     1. .agents/skills/design-taste-frontend/SKILL.md
     2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL**:
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"

---

## 10. AKTUÁLNÍ ÚKOLY

### 🚀 Prompt 043 – Implementace AI generování obrázků a limitů pro platformu X

- **Cíl**: Připravit aplikaci na ostrý start zavedením "kreditního" systému pro drahé funkce (AI obrázky a automatické X odesílání).
- **Striktní pravidlo (ctx-size 81920)**: Po dokončení každého kroku okamžitě označit krok jako hotový ([x]/✅) + zapsat do CHANGELOG.md + smazat sekci kroku z ukol.md + provést `git add -A` a `git commit`. Pak se zastavit a čekat na další pokyn.
- **Striktní pravidlo (překlady)**: Před dokončením každého kroku aktivně zkontrolovat, že všechny nové textové řetězce mají překlady v cs, en i uk. Pokud krok zavádí nové UI hlášky, doplnit chybějící i18n klíče ve všech třech jazycích.
- **Kroky**:
  - [x] KROK 1: DB Rozšíření (Limity). Vytvořit SQL migraci pro tabulku `users`. Přidat sloupce:
    * `ai_credits` (kolik zbývá AI obrázků).
    * `twitter_auto_credits` (kolik zbývá automatických postů na X).
    * Nastavit výchozí hodnoty (Free: 0, Creator: 10, Pro: 50). ✅
  - [x] KROK 2: Integrace OpenAI DALL-E 3 + i18n překlady. Backend routa `/api/ai/generate-image` + lokalizace hlášek (cs/en/uk). ✅
  - [x] KROK 3: AI Tlačítko v Editoru. Přidat vedle AI Pomocníka ikonku "AI Štětec". Po kliknutí jednoduchý input pro prompt, obrázek se přidá do příloh. ✅
  - [x] KROK 4: Upgrade odesílání na X. Platící uživatelé (Creator/Pro) s `twitter_auto_credits` mohou "Automatické odesílání". `publish.ts` zavolá X API v2. ✅
  - [x] KROK 5: UI Indikátory v Editoru. Zobrazit aktuální `ai_credits` u AI Štětce a `twitter_auto_credits` u volby automatického X odesílání. Použij vkusný, malý font (text-xs). ✅
  - [x] KROK 6: Aktualizace Ceníků. Do datové struktury tarifů (Free/Creator/Pro) přidej nové řádky s limity pro AI obrázky a X posty. Ujisti se, že se tyto řádky zobrazí v kartách na obou místech (Landing Page i Fakturace). ✅
  - [ ] KROK 7: Lokalizace (i18n). Doplň klíče pro tyto nové řádky ceníku a UI hlášky do cs, en, uk.
