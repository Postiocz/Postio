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

### Prompt 033 – Přepínač měn a prémiová Dual-Font Typografie

Cíl: Přidat do ceníku přepínač měn (USD, CZK, EUR) a povýšit vizuál veřejné Landing Page elegantním patkovým písmem (Serif) pro nadpisy a ceny, zatímco vnitřní aplikace (Dashboard/Fakturace) zůstane čistě bezpatková (Sans-serif).

Poznámky z analýzy:
- Projekt používá **Tailwind v4** (config v `globals.css` přes `@theme inline`, žádný `tailwind.config.js`). Serif font se přidá jako `--font-serif` proměnná do `@theme inline`.
- `src/app/layout.tsx` načítá jen `Inter` jako `--font-sans`.
- Ceník existuje 2×: `src/components/marketing/pricing-section.tsx` (Landing, server, jen `priceEur`) a `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` (Fakturace, client, už má `priceCzk/priceEur/priceUsd`).
- Přepínač měn musí být client komponenta (stav) → na Landing bude potřeba data předat do client wrapperu.

- [x] **Krok 1: Dual-Font System.** Naimportovat do `layout.tsx` Google Font 'Playfair Display' (elegantní Serif) přes `next/font/google` jako `--font-serif`. Zaregistrovat proměnnou `--font-serif` do `@theme inline` v `globals.css` (utility třída `font-serif`).
- [x] **Krok 2: Aplikace fontu na Landing Page.** Aplikovat patkový font STRIKTNĚ POUZE na hlavní nadpisy (H1, H2) veřejné Landing Page a na velká čísla cen (v `pricing-section.tsx`, též H2 v `faq-section.tsx`).
- [ ] **Krok 3: Izolace aplikace (In-app UI).** Upravit `billing-card.tsx` (přidat prop `isMarketingView?: boolean`). Na `/settings/billing` karta používá bezpatkový font; na Landing page použije Serif pro číslo ceny. (Landing používá `pricing-section.tsx` – zajistit konzistenci Serif jen na marketingu.)
- [x] **Krok 4: Datový model měn.** Upravit cenová data, aby každá karta podporovala 3 hodnoty: CZK, EUR, USD (Creator: 199 Kč / 8 € / 9 $, Pro: 499 Kč / 20 € / 22 $). Sjednotit v `pricing-section.tsx` (doplnit `priceCzk`/`priceUsd`) i `billing-card.tsx`.
- [ ] **Krok 5: Currency Switcher.** Vytvořit novou UI komponentu – elegantní pilulkový segmented control s Glassmorphismem. Přidat nad ceník na Landing page i na stránku Fakturace. Výběr měny přepíná zobrazené ceny + správné symboly (Kč, €, $).

