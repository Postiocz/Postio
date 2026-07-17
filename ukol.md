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

### 🔧 Mimořádný úkol – Sjednocení zarovnání na mobilu u Referral stránky

**Cíl:** Na mobilu odstranit nekonzistenci: stránka "Doporučení" má hlavičku + kroky "Jak to funguje" vycentrované, ale ostatní sekce doleva. Výsledek: na mobilu kompaktní "List view" (číslo vlevo, text vpravo, vše doleva), na desktopu zachovat stávající 4 karty vedle sebe (centrované).

**Analýza stavu (FÁZE 1):**
- `src/components/referral/referral-stats.tsx` – sekce "Jak to funguje" (BOTTOM): kontejner `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`; každá karta má `flex flex-col items-center text-center` → na mobilu 1 sloupec, kolečko nahoře, nadpis+popis centrované → zabírá zbytečně mnoho vertikálního místa a nesedí s levo-zarovnaným zbytkem stránky.
- MIDDLE sekce ("Váš doporučovací odkaz"): label `yourLink` je už čistě doleva (žádný `text-center`) – OK.
- `src/app/[locale](dashboard)/settings/referrals/page.tsx` – hlavní h1/p: `flex flex-col items-center text-center sm:items-start sm:text-left` → na mobilu vycentrované (toto bylo schváleno v předchozím úkolu, nyní chceme zrušit a zarovnat doleva všude).

**Krok 1: Mobilní accordion + Desktop původní vzhled (sekce "Jak to funguje")** `[x]`
- V `referral-stats.tsx` přepsat BOTTOM sekci "Jak to funguje":
  - Nadpis `howItWorks` (`h2`) v řádku s `ChevronDown` ikonou v `<button>` vpravo (flex `justify-between`). Šipka mobilní-only (`sm:hidden`); na desktopu nadpis statický, obsah vždy viditelný.
  - `useState(open)` (výchozí `false` = na mobilu sbaleno). Klik na šipku toggluje `open`; šipka rotuje `rotate-180` (`transition-transform duration-300 motion-reduce:transition-none`).
  - Grid karet: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; display třída: mobilní `${open ? "grid" : "hidden"}`, desktop vždy `sm:grid` (přepsání base).
  - Karta kroku: mobilní `flex flex-row items-start gap-4 text-left` (číslo vlevo, textový blok vpravo, kolečko `shrink-0`); desktop `sm:flex-col sm:items-center sm:text-center` (původní vzhled: 4 karty vedle sebe, centrované). Textový blok `flex flex-col gap-1 sm:items-center`, nadpis `sm:mt-3`, popis `sm:mt-1`.
- Import `ChevronDown` z `lucide-react`.
- `npx tsc --noEmit` + manuální test: Desktop = původní 4 karty centrované, šipka skrytá. Mobil = nadpis + šipka, obsah skrytý; po kliku se rozbalí (4 kompaktní řádky, číslo vlevo, text doleva), šipka se otočí.

**Krok 2 (byrokracie po schválení):** Označit Krok 1 ✅, zapsat do CHANGELOG.md (Pravidlo 6), git commit (Pravidlo 4).

### 🔧 Mimořádný úkol – Oprava čitelnosti mobilní navigace a sjednocení fontu na Login page

**Cíl:** (1) Spodní mobilní navigace (`mobile-nav.tsx`) je v Light mode nečitelná (šedý text na poloprůhledné černé liště). (2) Přihlašovací stránka (`(auth)/login/page.tsx`) nemá patkový font `--font-serif` jako Landing Page – sjednotit.

**Analýza stavu (FÁZE 1):**
- `src/components/dashboard/mobile-nav.tsx`:
  - Řádek 141: `<div className="bg-black/60 backdrop-blur-xl border-t border-white/10 h-[56px] ...">` – pozadí `bg-black/60` bez `dark:` varianty → v Light mode poloprůhledná čerň nad světlou stránkou = středně šedá lišta.
  - Řádek 156 (nav items) i 186 (settings trigger): `isActive ? "text-indigo-500" : "text-zinc-500"` bez `dark:` variantů. `text-zinc-500` (šedá) na středně šedé liště = špatný kontrast → v Light mode ikony i popisky téměř neviditelné.
  - `drop-shadow` glow u aktivní položky zůstává zachován.
- `src/app/[locale](auth)/login/page.tsx`:
  - Řádek ~38: `<h1 className="flex justify-center"><Logo .../></h1>` – H1 je brand Logo (žádný text "Postio"), bez `font-serif`.
  - Řádek ~41: `<h2 ...>{t("getStarted")}</h2>` – hlavní textový nadpis "getStarted", bez `font-serif`.
  - `--font-serif` (Playfair Display) zaveden v Promptu 033 (globals.css `@theme inline` + layout.tsx) a na Landing Page se aplikuje přes třídu `font-serif`. Na login page se zatím nepoužívá.
  - Poznámka: v kódu je "getStarted" v `<h2>`; `<h1>` je Logo. Pro sjednocení s Landing hero aplikujeme `font-serif` na textový nadpis `getStarted` (H1 = Logo ponecháme bez serifu, je to brand značka).

**Krok 1: Oprava kontrastu Mobile Nav** `[x]`
- V `mobile-nav.tsx`:
  - Řádek 141: `bg-black/60 backdrop-blur-xl border-t border-white/10` → `bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10` (adaptivní světlá/tmavá lišta).
  - Řádek 156 (nav items): `isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-zinc-400"`.
  - Řádek 186 (settings trigger): stejná změna `isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-zinc-400"`.
- `npx tsc --noEmit` + manuální test (Light + Dark mode): ikony i popisky jasně čitelné, aktivní indigo, neaktivní šedá/slates.

**Krok 2: Premium Font na Login Page** `[ ]`
- V `(auth)/login/page.tsx` přidat `font-serif` do className nadpisu `getStarted` (`<h2>`): `className="mt-8 text-4xl font-bold tracking-tight text-foreground font-serif sm:text-5xl lg:text-6xl"`.
- (Volitelné k diskusi) též `font-serif` na `<h1>` Logo? Doporučuji NE – Logo je brand značka.
- `npx tsc --noEmit` + manuální test: nadpis "getStarted" v patkovém fontu, vizuálně sladěný s Landing Page hero.

**Krok 3 (byrokracie po schválení):** Označit Kroky 1–2 ✅, zapsat do CHANGELOG.md (Pravidlo 6), git commit (Pravidlo 4).

