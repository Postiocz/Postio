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


## 🎯 Úkol: Sjednocení Login page s vizuálním stylem Landing page (Prompt 026)

**Design Read (dle taste skill 0.B):** Redesign-preserve přihlašovací stránky tak, aby vizuálně odpovídala
již zavedenému Postio marketingu (Premium Glassmorphism, indigo/purple glow orby, 24x24 grid, Geist wordmark).
Nejde o nový design jazyk, pouze o sjednocení s Hero sekcí landing page. Dials: VARIANCE 5 / MOTION 5 / DENSITY 4
(shodné s existujícím marketingem). Žádné em-dash, žádné AI-slop novoty.

**Klíčové soubory:**
- `src/app/[locale]/(auth)/login/page.tsx` (upravovaná stránka)
- `src/components/auth/login-visual.tsx` (pravý panel - stará komponenta s bugem)
- `src/components/marketing/hero-dashboard-preview.tsx` (cílový styl karty)
- `src/components/marketing/marketing-nav.tsx` (cílový styl navbaru / mléčné sklo)
- `src/app/[locale]/(marketing)/layout.tsx` (cílové pozadí: grid + indigo glow)
- `src/components/ui/logo.tsx`, `src/components/locale-switcher.tsx`, `src/components/theme-toggle.tsx` (sdílené)

---

### ✅ Krok 1 - Pozadí login page sjednotit s Hero (grid + glow orby)
- V `login/page.tsx` nahradit stávající `bg-slate-200/50` + svg grid za stejný vizuální základ jako
  `(marketing)/layout.tsx`: 24x24 grid přes `bg-[linear-gradient(...)] bg-[size:24px_24px]` (šedé v light,
  bílé v dark) + centrální indigo glow orb `bg-indigo-500/20 blur-[160px]` nahoře uprostřed (dark silnější
  `bg-indigo-500/35`).
- Kořenový `div` stránky opatřit `overflow-hidden`, aby glow orby nemohly způsobit horizontální scroll
  (stejně jako `overflow-hidden` na `<section>` v Hero).
- Zachovat `min-h-screen` (resp. `min-h-[100dvh]`) a `bg-slate-50 dark:bg-black` jako základ.
- Ověřit, že intenzita glow odpovídá landing page v obou módech (light jemnější, dark silnější).

### ✅ Krok 2 - Horní lišta (navbar) v stylu marketingu
- Vytvořit `src/components/auth/auth-nav.tsx` (client komponenta) jako zjednodušená varianta `MarketingNav`:
  plovoucí glass pill (`fixed top-6 left-1/2 -translate-x-1/2`, `rounded-full`, `bg-white/70 dark:bg-black/70
  backdrop-blur-md`, border, shadow) s `Logo` vlevo (odkaz na `/${locale}`) a `LocaleSwitcher` + `ThemeToggle`
  vpravo. Bez marketing odkazů (#funkce/#cenik/#faq) a bez Login CTA (jsme na loginu).
- V `login/page.tsx` vložit `<AuthNav />` a odebrat osamocený `<LocaleSwitcher className="absolute top-4 right-4 ..." />`
  z levého panelu (přepínač jazyka přejde do navbaru).

### ✅ Krok 3 - Pravý panel: sjednotit styl + opravit překrývající se badge
- V `login-visual.tsx` sjednotit kartu s `HeroDashboardPreview`: stejný shell
  (`rounded-[20px] border border-border bg-gradient-hero shadow-[0_20px_60px_...]`), grid overlay
  (`opacity-[0.05] dark:opacity-[0.04]`) a glow blobs (light jemnější / dark silnější).
- **Oprava bugu:** floating badge "Post scheduled" a "+24% engagement" se nesmí překrývat kartu statistik
  ani uřezávat 3. stat ("4.2% Eng."). Řešení (stejné jako u HeroDashboardPreview, kde překryv zmizel):
  - Odebrat `scale-125` (příčina uříznutí) - použít responzivní `w-full max-w-*` bez scale transformu.
  - "Post scheduled" badge umístit do mezery NAD hlavní kartou (např. `absolute -top-4 left-4` mimo obsah karty),
    "+24% engagement" badge do mezery POD kartou (např. `absolute -bottom-4 right-4`), aby ani jeden
    nepřekrýval řádek metrik.
  - Vnější wrapper mít `overflow-visible` (badge nejsou oříznuty); `overflow-hidden` pouze na samotné kartě
    pro clip jejího glow.
  - Zkontrolovat všechny šířky (1280/1440/1920), že badge ani karta nepřetékají a nic není oříznuté.
- Zachovat existující i18n (login page předává `labels` s `visual*` klíči z `auth` namespace).

### ✅ Krok 4 - Typografie a odsazení nadpisů
- "Postio" wordmark vlevo: nahradit ruční `<h1><span className="text-primary">P</span>ostio</h1>` za
  komponentu `<Logo />` (stejná jako v navbaru) pro 100% brand konzistenci.
- "Začněte s Postio" (`getStarted`) zarovnat na typografii Hero nadpisu: `text-4xl font-bold tracking-tight
  text-foreground sm:text-5xl lg:text-6xl` (nyní je `text-4xl font-semibold`, což nesedí s Hero).
- Zkontrolovat odsazení (mt-*) a barvy, aby odpovídaly Hero sekci (ne ad-hoc styl).

### Krok 5 - Testování (Dark/Light + 1280/1440/1920px)
- Spustit `npx tsc --noEmit` a `npx eslint` na změněných souborech (0 errors).
- Vizuálně zkontrolovat v prohlížeči (manuální test uživatele dle Pravidla 3):
  - Dark i Light mode.
  - Šířky 1280 / 1440 / 1920 px.
  - Žádné uříznutí karty/badge/3. statistiky.
  - Glow orby nezpůsobují horizontální scroll (overflow-hidden funguje).
  - Navbar konzistentní s marketingem, LocaleSwitcher + ThemeToggle funkční.
- Až uživatel potvrdí OK, označit kroky ✅ a zapsat záznam do CHANGELOG.md (Pravidlo 3).
