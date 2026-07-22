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

4. **GIT COMMIT (Automaticky po Pravidle 7 – smazání úkolu):**
   Jakmile je úkol kompletně hotový, test potvrzen (Pravidlo 3), zapsán do `CHANGELOG.md` a sekce úkolu smazána z `ukol.md` (Pravidlo 7), **automaticky provedeš `git add -A` a `git commit`** – tím se jedním commitem uloží všechny změny včetně smazání sekce z `ukol.md`. Po commitu se ujisti, že `git status` ukazuje **čistý working tree** („nothing to commit, working tree clean"). Teprve pak se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** – ten dělá výhradně uživatel sám.

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

### Prompt 037 – Inicializace Admin Core (Pojízdná kancelář)

Cíl: Vytvořit izolovaný, znovupoužitelný framework pro administraci (Admin Dashboard), technicky oddělený od hlavní aplikace Postio, ale sdílející databázi a autentizaci.

#### Architektoní rozhodnutí
- Admin Core bude **balíčkem ve `packages/admin-core`** (npm workspace / lokální import). Obsahuje: typy, konfigurační soubor (`admin-config.ts`), middleware/guard, a případně sdílené komponenty.
- Frontend admina běží jako součást Next.js app routeru v `src/app/[locale]/(admin)/` — oddělená route skupina od `(dashboard)`.
- Autentizace: využívá stávající Supabase session (`createClient` / `createAdminClient`). Role se určuje z DB sloupce `users.role`.
- DB: přidává se sloupec `role` do `public.users` a nová tabulka `audit_logs` pro admin-only viditelnost.

#### Plán kroků

- ✅ **KROK 1: Příprava prostředí.** Vytvořena složka `packages/admin-core` s typy (`types.ts`), konfigurací (`admin-config.ts`) a hlavním exportem (`index.ts`). Přidán path alias `admin-core` do `tsconfig.json`.
- ✅ **KROK 2: Admin Role v DB.** Vytvořena migrace `041_add_admin_role_and_audit_logs.sql` (sloupec `role`, tabulka `audit_logs`, RLS politiky). Aktualizovány TypeScript typy v `types.ts`.
- ✅ **KROK 3: Admin Guard (Zabezpečení).** Implementován `checkAdminAccess()` helper v `packages/admin-core/src/guard.ts`. Vytvořen layout `src/app/[locale]/(admin)/layout.tsx` s guardem a vstupní stránka `admin/page.tsx`. Build projde.
- [ ] **KROK 4: Admin Shell (UI).** Vytvořit základní layout adminu: Sidebar, Header s vyhledáváním uživatelů a Metric karty pro rychlý přehled (celkem uživatelů, dnešní tržby). Použij design manuály (Pure Black pozadí, 20px radius, glassmorphism).
- [ ] **KROK 5: Modul Správa uživatelů.** První reálná tabulka se seznamem uživatelů Postia, jejich tarify a datem registrace.

