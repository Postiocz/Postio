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

### 📋 Prompt 033 – Vytvoření Footeru a Právních stránek

**Kontext (zjištěno analýzou):** V `doc/` jsou 4 `.txt` dokumenty (cs, bez diakritiky v části textu – renderujeme jak jsou). V `src/components/marketing/site-footer.tsx` už existuje `SiteFooter` (newsletter + jednoduchá lišta) a je vykreslen v `app/[locale]/(marketing)/page.tsx` přes `<SiteFooter locale={locale} />`. Layout `(marketing)` už obsahuje `MarketingNav` + grid pozadí, takže nové stránky dostanou nav automaticky. `@tailwindcss/typography` NENÍ nainstalován → použiji vlastní čisté stylování (konzistentní s existující `/privacy` stránkou). Cookie modal (`cookie-consent.tsx`) je globalní v `[locale]/layout.tsx`, ale Dialog mize z DOMu, jakmile je souhlas uložen → pro odkaz "Nastavení cookies" je třeba ho upravit.

**✅ Schválená rozhodnutí (uživatelem potvrzena před Krokem 1):**
- **A) Newsletter:** PONECHÁVÁ se nahoře, pod ním 4 sloupce + spodní řádek.
- **B) EN/UK právní texty:** Pro `en`/`uk` se zobrazí cs zdroj (funkční, bez překladu).
- **C) Mrtvé odkazy:** Changelog, Srovnání s Bufferem, Status služby, Stáhnout aplikaci se VYNECHÁVAJÍ. Registrace → `/{locale}/login`.
- **D) `/privacy` vs `/privacy-policy`:** Obě existují; `/privacy` ponechána (odkazuje na ni cookie consent).

---

#### ✅ Krok 1 – Komponenta `SiteFooter` (4 sloupce + spodní řádek) — HOTOVÝ, ověřeno uživatelem
- **Soubor:** přepsat `src/components/marketing/site-footer.tsx` (zachovat export `SiteFooter({ locale })` → `page.tsx` se nemění).
- **Design:** Pure Black (`bg-black`), horní ohraničení `border-white/10`. Nadpisy sloupců: `uppercase font-bold text-white`. Odkazy: `text-[#A89FFF] hover:text-[#6C47FF]`.
  - Volitelná newsletter karta nahoře (dle rozhodnutí A).
  - **4 sloupce** (`grid` 1→2→4 cols, mobile-friendly):
    1. **PRODUKT:** Funkce (`#funkce`), Ceník (`#cenik`), Changelog (`#` dle C), Srovnání s Bufferem (`#` dle C)
    2. **PODPORA:** FAQ (`#faq`), Kontakt (`mailto:info@postio-app.cz`), Status služby (`#` dle C)
    3. **PRÁVNÍ & GDPR:** Ochrana osobních údajů (`/{locale}/privacy-policy`), Obchodní podmínky (`/{locale}/terms-of-service`), GDPR / DPA (`/{locale}/dpa`), Transparentnost AI (`/{locale}/ai-transparency-notice`), Nastavení cookies (tlačítko → modal)
    4. **APLIKACE:** Přihlásit se (`/{locale}/login`), Registrace (`/{locale}/login` dle C), Stáhnout aplikaci (`#` dle C)
  - **Spodní řádek** (`flex flex-col sm:flex-row justify-between`): vlevo Logo + `© 2026 Postio. Všechna práva vyhrazena.` + `Plánujte a publikujte obsah na sociální sítě s AI.`; uprostřed `Vytvořeno s ❤️ v České republice`; vpravo `<LocaleSwitcher />`.
- **Sub-úkoly:**
  - `LocaleSwitcher` je client komponenta (`useSearchParams`) → v patičce (server) obalit do `<Suspense>`.
  - **Nová client komponenta** `src/components/marketing/cookie-settings-link.tsx`: tlačítko `<button>` s `onClick` dispečující `window.dispatchEvent(new CustomEvent("postio:open-cookie-settings"))`.
  - **Úprava `cookie-consent.tsx`:** Dialog s předvolbami nechat vždy namountovaný (přesunout mimo `if (!show) return null`) a přidat `useEffect` naslouchající na `postio:open-cookie-settings` → `setOpen(true)`. Floating karta zůstává podmíněná (`!isPrivacyPage && !consent`).
- **Ověření:** `npx tsc --noEmit` ✅; manuální test v prohlížeči.

#### ✅ Krok 2 – i18n pro Footer (namespace `footer`)
- Přidat top-level `footer` namespace do `src/messages/{cs,en,uk}.json` s klíči: `productTitle`, `supportTitle`, `legalTitle`, `appTitle`, `product.features`, `product.pricing`, `product.changelog`, `product.compareBuffer`, `support.faq`, `support.contact`, `support.status`, `legal.privacy`, `legal.terms`, `legal.dpa`, `legal.aiTransparency`, `legal.cookieSettings`, `app.login`, `app.register`, `app.download`, `copyright`, `tagline`, `madeInCz`.
- (Původní `landing.footer` klíče zůstanou nedotčené; nový footer použije `footer`.)

#### ✅ Krok 3 – Generování 4 rout (veřejné)
- **Složky/soubory** v `src/app/[locale]/(marketing)/`:
  - `privacy-policy/page.tsx` ← `doc/01_Postio_Zasady_ochrany_osobnich_udaju.txt`
  - `terms-of-service/page.tsx` ← `doc/02_Postio_Obchodni_podminky.txt`
  - `dpa/page.tsx` ← `doc/03_Postio_Smlouva_o_zpracovani_osobnich_udaju_DPA.txt`
  - `ai-transparency-notice/page.tsx` ← `doc/04_Postio_Oznameni_o_transparentnosti_AI.txt`
- Každá stránka: server komponenta, čte příslušný `.txt` přes `fs/promises` (Node runtime, `process.cwd()/doc/...`), vykreslí `<SiteFooter locale={locale} />` dole. Hlavička = Logo link zpět (jako `/privacy`).
- **Middleware:** routy pod `(marketing)` NEJSOU v `isDashboardRoute` → jsou veřejné automaticky, **žádná funkční změna není nutná**. (Volitelně: přidat komentář/veřejný seznam pro explicitnost – viz poznámka v Krok 3.)

#### ✅ Krok 4 – Naplnění obsahem (formátování `.txt`)
- Parser (server-side v každé stránce): rozdělit text na řádky; pravidla:
  - `^\d+\.\s+[A-Z...]` nebo `^\d+\.\d+\s` → `<h2>` nadpis (bílý, `font-semibold`)
  - řádek začínající `* ` → odrážka (seznam)
  - prázdný řádek → mezera mezi odstavci
  - ostatní → `<p>` (`leading-relaxed text-muted-foreground`)
- Hlavičku dokumentu (POSTIO, název, URL, datum) vykreslit jako titulek stránky + `Naposledy aktualizováno`.
- Stylování: container `max-w-3xl mx-auto px-6 py-12`, konzistentní s `/privacy` (black bg, white headings). Žádný externí plugin.
- **EN/UK:** dle rozhodnutí B (cs zdroj, nebo placeholder).

---
*Po schválení každého kroku: označit ✅, zapsat CHANGELOG (max 10 záznamů), dle Pravidla 4 git commit. Žádný push.*

