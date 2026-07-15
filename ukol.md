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

### 📱 Úkol – Kritická oprava mobilní responzivity (landing + cookie)

**Stížnosti uživatele:**
1. Obrazovka na mobilu příliš široká (horizontální posuv).
2. Burger menu na **landing page** po rozkliknutí nemá tlačítko zpět/zavřít.
3. Cookie dialog „Používáme soubory cookie" má rozbitou responzivitu, uživatel se nedostane zpět.
> Pozn.: Mobilní navigace v **dashboardu** je v pořádku – neřešíme.

**Analýza (po přečtení kódu):**
- **Burger (landing):** `src/components/marketing/marketing-nav.tsx` – celoobrazovkový overlay má `z-40` (ř. 119), ale plovoucí header s hamburgerem má `z-50` (ř. 58). Overlay má vlastní zavírací X (ř. 125–132), ale ten je **schovaný pod headerem** → uživatel vidí jen hamburger, klik na něj znovu volá `setOpen(true)` a X je nedostupné = „chybí tlačítko zpět".
- **Přetečení:** `src/app/globals.css` – `body` má jen `min-h-screen`, chybí `overflow-x-hidden`.
- **Cookie dialog:** `src/components/ui/dialog.tsx` `DialogContent` nemá `max-h` ani `overflow-y-auto`. Na nízkém mobilu obsah (nadpis + 4 karty + zápatí) přesáhne výšku viewportu, dialog je vycentrovaný → zavírací X i tlačítka jsou mimo obrazovku = „nelze zpět".

**Kroky:**

- [ ] **KROK 1 – Globální zábrana horizontálního přetečení**
  - `src/app/globals.css` → v `@layer base` do `body` přidat `overflow-x-hidden`.
  - Dopad: mizí horizontální scroll plošně (stížnost 1).

- [x] **KROK 2 – Oprava zavíracího tlačítka burger menu (landing)**
  - `src/components/marketing/marketing-nav.tsx` → zvednout overlay nad header (`z-40` → `z-[60]`), aby jeho horní lišta s X byla viditelná a klikatelná. (Alternativa: přepnout hamburger v headeru na X, když je `open`.)
  - Dopad: viditelné/funkční tlačítko zpět (stížnost 2).

- [x] **KROK 3 – Oprava responzivity a návratnosti cookie dialogu** (+ footer newsletter)
  - `src/components/ui/dialog.tsx` → `DialogContent` `max-h-[90vh] overflow-y-auto overflow-x-hidden`.
  - `src/components/cookie-consent.tsx` → tlačítko **Zavřít** v zápatí (i18n `cookie.close` cs/en/uk), footer složí tlačítka pod sebe na mobilu.
  - `src/components/marketing/newsletter-form.tsx` → formulář `flex-col sm:flex-row`, tlačítko `w-full sm:w-auto`, input `min-w-0` (oprava přetečení tlačítka „Odebírat" ve footeru).
  - Dopad: dialog i footer vejdou do obrazovky, zavírá se přes X i „Zavřít" (stížnost 3).

- [ ] **KROK 4 – Plovoucí cookie karta vs. `/privacy`**
  - `src/components/cookie-consent.tsx` → skrýt plovoucí kartu na trase `/privacy` (tam je sekce Cookies + vlastní návrat dole, který karta překrývá).

- [ ] **KROK 5 – Ověření**
  - `npx tsc --noEmit` + manuální test responzivního režimu (320/375/390px): landing burger, cookie karta→dialog, `/privacy`.
  - Dle Pravidla 8 před UI změnami načíst design manuály.

**Doporučené pořadí:** KROK 2 (burger – hlavní stížnost) → KROK 3 (cookie) → KROK 1 (přetečení) → KROK 4 → KROK 5.

