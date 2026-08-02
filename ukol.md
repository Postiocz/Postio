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

### 10.3 Prompt 057 – Skrytí promo akcí před stávajícími uživateli

**Problém:** Registrovaný uživatel (např. Admin s Pro) vidí na stránce Fakturace akční
nabídky určené výhradně pro nové uživatele (např. "Testovací Akce" za1 Kč). Aktuální
billing stránka načítá VŠECHNY viditelné custom plány bez ohledu na to, zda jde o promo
pro nové uživatele. Nutnost: skrýt promo akce před stávajícími uživateli a zabránit
jejich nákupu.

**Cíl:** Stávající uživatelé nevidí ani si nemohou koupit `is_new_user_only` plány.

- [x] **KROK 1: Identifikace "New User Only" plánů** — ✅ hotovo
      Migrace `049_add_new_user_only.sql`: `is_new_user_only BOOLEAN DEFAULT false`
      + backfill (`is_promo = true` → `is_new_user_only = true`) + index.
      `src/lib/supabase/types.ts` aktualizováno (Row/Insert/Update).

- [ ] **KROK 2: Striktní filtr ve Fakturaci**
      - Upravit `src/app/[locale]/(dashboard)/settings/billing/page.tsx`.
      - Master plány (`is_master_template = true`) se zobrazují vždy.
      - Promo plány (`is_new_user_only = true`) se zobrazí JEN pokud uživatel tento
        plán AKTIVNĚ používá (`users.current_plan_instance_id` === plán.id) – jako svůj
        aktuální. ŽÁDNÉ jiné promo nabídky se nezobrazují.
      - Výchozí: nezobrazovat žádné promo plány stávajícímu uživateli.

- [x] **Dodatečný fix: Logika promo/odpočtu (potvrzeno)** — ✅ hotovo
      - Landing page zobrazuje custom plány jen `is_public = true` (`pricing-section.tsx`).
      - "Veřejný web" přepínač dostupný pro všechny custom plány (ne jen promo) v Adminu.
      - Odpočet se renderuje JEN pro promo plány (`plan.isPromo && plan.activeUntil`).
      - Vypnutí promo v Adminu vymaže `active_from`/`active_until` (odpočet zmizí).

- [ ] **KROK 3: Ochrana Checkout API**
      - Upravit `src/app/api/stripe/checkout/route.ts`.
      - Při checkoutu custom plánu (UUID) načíst plán z DB a zkontrolovat
        `is_new_user_only`. Pokud je true a uživatel je stávající (nemá tento plán
        jako `current_plan_instance_id`), vrátit 403 s chybou:
        "Tato nabídka je určena pouze pro nové zákazníky."

- [ ] **KROK 4: UI Úklid**
      - Ze stránky Fakturace zmizí spodní karty (akce). Uživatel na Pro tarifu uvidí
        jen 3 hlavní master karty a u Pro nápis "Aktuální".

### 10.4 Prompt 054 – Vyčištění Master šablon a fixace podmínek

**Cíl:** Zjednodušit správu základních tarifů a zajistit, aby změny v Master
šablonách neovlivnily již platící uživatele (Snapshot logic).

- [x] **KROK 1: Redukce Master Modálu (UI)** — ✅ hotovo
      V `EditPlanModal` (admin) uprav zobrazení pro plány s `is_master_template = true`:
      - Úplně schovej sekce "Akční nabídka (promo)" a "Časové omezení (flash sale)".
      - Ponechej pouze přepínač "Veřejný web" (is_public).
      - ✅ Dodatečně: `pricing-section.tsx` přepsán na dynamické načítání master plánů z DB
        (respektuje `is_public`, pořadí Free→Creator→Pro, lokalizace, hardcoded fallback).
        DB: master plánům nastaveno `is_public = true` (dříve false → zmizely by z webu).

- [x] **KROK 2: Fixace podmínky (Snapshot Logic)** — ✅ hotovo
      - Checkout předává `plan_instance_id` do metadata; webhook po platbě zapisuje
        `current_plan_instance_id` (a při zrušení předplatného přepíná na Free master).
      - Migrace `050_plan_snapshot_binding.sql`: backfill stávajících uživatelů +
        trigger pro nové (auto Free). Ověřeno v DB – uživatelé mají vazbu na instanci.
      - Změny Master šablony adminem neovlivňují vazbu stávajících uživatelů
        (odkazují na instanci z momentu nákupu).

- [ ] **KROK 3: Ochrana proti smazání**
      Zablokuj možnost smazání 3 základních Master šablon (Free, Creator, Pro)
      v Admin rozhraní.

