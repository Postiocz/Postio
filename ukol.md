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
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutně.

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

### 🎨 Prompt 070 – Sjednotit EditPostDialog s funkcemi /posts/new (2026-09-08)

- **Kontext**: Při editaci hotového příspěvku i konceptu se z `/posts` otevírá `EditPostDialog` (vzhled modálu uživateli vyhovuje, beze změny), ale edit modál nemá všechny funkce jako stránka `/posts/new`. Analýza dialogu (2849 řádků) vs. posledních feature `/posts/new` ukázala, že v sekci „Čas" chybí právě Quick slot čipy + odkaz do nastavení rozvrhu (ostatní bloky – Content/AI, Media, Účty, TikTok privacy, Lokace, Hashtagy, Interní štítky, Live Preview, akční tlačítka – v modálu JSOU).
- [ ] KROK 1: Quick slot čipy (`ScheduleQuickSlots`) do edit modálu.
     * Sekce „Čas" má jen `DateTimePicker` (edit-post-dialog.tsx ř. ~2605); chybí čipy Fronta / Dnes 18:00 / Zítra 09:00 z `/posts/new`.
     * Importovat sdílenou `<ScheduleQuickSlots>` (props `value`/`onSelect`/`locale` + `labels` přes `t(...)` z posts namespace – klíče `quickSlotQueue`, `quickSlotToday18`, `quickSlotTomorrow9`, `quickSlotQueueLoading`, `quickSlotWordToday`, `quickSlotWordTomorrow`), vykreslit pod `DateTimePicker` v edit modu; toggle odznačení funguje přes `onSelect("")` (vynuluje `scheduledAt`).
- [ ] KROK 2: Odkaz do nastavení rozvrhu v edit modálu.
     * Vedle labelu sekce „Čas" ikona `Settings` (Lucide) v Radix tooltipu + `Link` na `/{locale}/settings/preferences`, i18n `editSchedule` (cs/en/uk), `aria-label` – shodně s `/posts/new` (KROK 2, Prompt 068).
- [ ] KROK 3: Vizuální kontrola (Light/Dark).
     * Aktivní čip v modálu = indigo dle design manuálů (Light `text-indigo-700`, dark `text-indigo-200`), kontrast WCAG AA; settings ikona `text-slate-500 hover:text-indigo-600 dark:text-muted-foreground`.
     * Ověřit `npx tsc --noEmit` + manuální test obou režimů.
