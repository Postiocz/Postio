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

### Prompt 044-REVISED – Launch Guard a Admin Credit Management

**Cíl**: Učesat aplikaci pro první reálné uživatele – vizuální zámky pro sandbox platformy, správa kreditů v adminu, a ochrana soukromí.

---

- [x] **KROK 1: Launch Guard (Vizuální zámky)** ✅
  - U platforem v režimu Sandbox (TikTok, Facebook, Instagram) přidat v sekci Účty i v Editoru vkusný odznáček "BETA".
  - **Logika**:
    - Pokud je přihlášený uživatel `admin`, vše funguje normálně.
    - Pokud je běžný uživatel, propojení bude `disabled` s tooltipem: *"Právě probíhá schvalování sítě. K dispozici do několika dní."*
  - **Místa implementace**:
    - `src/app/[locale]/(dashboard)/accounts/page.tsx` – tlačítka propojení
    - Editor (posts/new, edit-post-dialog) – výběr platforem

- [x] **KROK 2: Admin Credit Manager** ✅
  - V admin modulu v detailu uživatele (`/admin/users/[id]`) přidat sekci "Správa kreditů".
  - **Požadavky**:
    - Zobrazení aktuálních hodnot `ai_credits` a `twitter_auto_credits`.
    - Input pole pro ruční úpravu + tlačítko "Uložit".
    - Server action pro update kreditů s zápisem do `audit_logs` (action: `credits_updated`, metadata: `{ old_ai, new_ai, old_twitter, new_twitter }`).
  - **Místa implementace**:
    - `src/app/[locale]/(admin)/admin/users/[id]/page.tsx` – UI sekce
    - `src/modules/admin-core/actions.ts` – server action `updateUserCredits()`
    - i18n: nové klíče v namespace `adminUserDetail`

- [x] **KROK 3: Ochrana logů a soukromí** ✅
  - Implementovat globální guard, který v produkčním režimu (`postio-app.cz` nebo `VERCEL_ENV=production`) zabrání vypisování `console.log` s citlivými daty.
  - **Požadavky**:
    - Využít existující `src/lib/logger.ts` (již implementováno v Prompt 044 KROK 4).
    - Audit zbývajících `console.log` volání v kódu a jejich nahrazení za `logger.debug`/`logger.info`.
    - Filtrování citlivých dat (tokeny, user IDs) v logovacích voláních.
  - **Místa implementace**:
    - Globální vyhledání `console.log`/`console.warn` v client komponentách a API routes.
    - Nahrazení za `logger.debug` (potlačeno v produkci) nebo odstranění.

- [ ] **KROK 4: Feedback Modul** (částečně hotovo – odkaz v sidebaru ✅)
  - Přidat do sidebaru odkaz "Zpětná vazba" s tooltipem.
  - Rozšířit na plnohodnotný Feedback Modul s databází a admin rozhraním.
  - **Místa implementace**:
    - `src/components/dashboard/sidebar.tsx` – odkaz s tooltipem ✅
    - i18n: klíč `feedback` v namespace `nav` ✅

- [ ] **KROK 4.1: DB Migrace**
  - Vytvoř tabulku `public.feedback` (id, user_id, message, type [bug, feature, other], status [new, read, resolved], created_at).
  - Přidat RLS politiky (uživatelé vkládají vlastní feedback, admin čte vše).
  - **Místo implementace**:
    - `supabase/migrations/XXX_create_feedback_table.sql`

- [x] **KROK 4.2: UI Formulář** ✅
  - Místo otevírání e-mailu otevři po kliknutí na "Zpětná vazba" modální dialog (Glassmorphism).
  - Formulář: výběr typu (bug, feature, other) + text zprávy.
  - **Místa implementace**:
    - `src/components/feedback-modal.tsx` – nová komponenta
    - `src/components/dashboard/sidebar.tsx` – integrace modalu
    - i18n: nové klíče v namespace `feedback`

- [ ] **KROK 4.3: Server Action**
  - Vytvoř akci pro bezpečné uložení feedbacku do databáze.
  - **Místa implementace**:
    - `src/lib/actions/feedback.ts` – nový soubor s `submitFeedback()`

- [x] **KROK 4.4: Admin View** ✅
  - Vytvoř stránku `/admin/feedback` pro globální přehled doručených zpráv.
  - Přístupné jen pro adminy.
  - **Místa implementace**:
    - `src/app/[locale]/(admin)/admin/feedback/page.tsx` – nová stránka
    - `src/modules/admin-core/components/admin-sidebar.tsx` – odkaz do navigace
    - i18n: namespace `adminFeedbackPage`