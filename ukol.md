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

4. **GIT COMMIT (Automaticky po schválení Kroku 3):**
   Jakmile dokončíš Krok 3 (vše je otestované, ✅ v `ukol.md`, záznam v `CHANGELOG.md`), **automaticky sám provedeš `git add` + `git commit`** aktuálního stavu. Tím se trvale zachová i případný záznam, který v budoucnu propadne prořezáním `CHANGELOG.md` (Pravidlo 6) – historie zůstává v Gitu a nic se neztratí. Po commitu se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** – ten dělá výhradně uživatel sám.

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

10. **SEKCE - AKTUÁLNÍCH ÚKOLŮ:**
  📌 Aktuální úkoly

  ### 🚀 Prompt 021 – Kompletní Frontend / Marketingové stránky (Landing Page)
  **Cíl:** Veřejná "výkladní skříň" (Landing Page) na domovské URL místo okamžitého přesměrování na login.

  **Design Read (dle manuálů):** `design-taste-frontend` + `high-end-visual-design` →
  čteme to jako *"B2B/SaaS marketing landing pro tvůrce obsahu, prémiový dark glassmorphism jazyk,
  leaning toward Next.js + Tailwind v4 + Motion + Geist"*.
  - DIALY: `VARIANCE 7 / MOTION 6 / DENSITY 4` (landing preset).
  - BRAND LOCK: indigo `#6366F1` je povolený (LILA RULE override + CLAUDE.md). Jeden akcent napříč stránkou.
  - THEME LOCK: dark (pure black `#000`/`#09090b`, glassmorphism, grid 24x24, glow) – shodné s existujícím loginem/dashboardem.
  - FONT: Geist (next/font) pro marketing sekci (Inter je v manuálech banned; CLAUDE.md povoluje Geist).
  - RADIUS: 20px všude (`rounded-[20px]`). Ikon: lucide (projekt už závisí – přípustné).
  - ZAKÁZANÉ TELLY: em-dash (`—`) nikde, žádné 3× stejné karty, žádné div-fake-screenshots (použít reálný screenshot aplikace / vygenerovaný obrázek), max 1 eyebrow / 3 sekce, hero ≤2 řádky + subtext ≤20 slov + CTA bez scrollu, `min-h-[100dvh]` nikoli `h-screen`.

  **Kroky (jednotlivě dle Pravidla 2):**
  - [x] **Krok 1 – Úprava Routingu**
    - V `middleware.ts`: odebrat `restPath === "/"` z `isDashboardRoute` (domovská `/` bude VEŘEJNÁ).
    - Přesunout současnou domovskou stránku `(dashboard)/page.tsx` → `(dashboard)/dashboard/page.tsx` (nová URL `/cs/dashboard`).
    - Přidat `/dashboard` do `isDashboardRoute` v middleware (konzistence + redirect nepřihlášených na login).
    - Aktualizovat všechny odkazy na dashboard-kořen `/${locale}` → `/${locale}/dashboard` (Sidebar `navItems[0]`, MobileNav, případné další `redirect`).
    - Vytvořit route group `app/[locale]/(marketing)/page.tsx` → veřejná Landing na `/cs`.
    - **Doporučení chování:** nepřihlášený na `/` vidí Landing; přihlášený na `/` → `redirect` na `/cs/dashboard` (aby app "domů" zůstala aplikace). Nutno potvrdit při implementaci Krok 1.
  - [x] **Krok 2 – Marketing Layout (veřejná navigace)**
    - Nový `(marketing)/layout.tsx`: plovoucí glass nav (Logo, odkazy Funkce/Ceník/FAQ, LocaleSwitcher, ThemeToggle, CTA "Přihlásit se" → `/cs/login`).
    - Per high-end skill: floating glass pill (`mt-6 mx-auto rounded-full backdrop-blur`), height ≤80px, single-line.
    - Dědí `LocaleLayout` (NextIntl + ThemeProvider + CookieConsent).
  - [x] **Krok 3 – Hero Sekce & Výhody**
    - Asymetrický split hero (text vlevo, reálný vizuál aplikace vpravo) – NE centerovaný (VARIANCE 7).
    - H1 ≤2 řádky, subtext ≤20 slov, 1 primární CTA ("Začít zdarma" → `/cs/login`) + max 1 sekundární.
    - Reálný vizuál: screenshot existující aplikace nebo vygenerovaný obrázek (NE div-fake).
    - Sekce Výhody: AI Vision, Auto-Queue (dle CLAUDE.md) – bento grid s rytmem, ne 3× stejné karty.
  - [x] **Krok 4 – Ceník & FAQ**
    - Ceník: znovupoužít strukturu `Plan` z `billing-card.tsx` (free/creator/pro, `priceCzk/Eur/Usd`, `features`) → 3 veřejné karty s `isRecommended` (Creator).
    - FAQ: rozbalovací accordion (Motion `whileInView`, reduced-motion fallback).
  - [x] **Krok 5 – Lokalizace (cs/en/uk)**
    - Přidat nový namespace `landing` do `messages/cs.json`, `en.json`, `uk.json` (hero, výhody, ceník, FAQ, nav).
    - Všechny řetězce přes `useTranslations("landing")` / server `getTranslations`.

  **Poznámka k ověření (Pravidlo 3):** každý Krok se označí ✅ až po tvém manuálním otestování v prohlížeči + zápisu do CHANGELOG.md.
