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

### 🎯 Prompt 034 – Referral program ("Doporuč a získej")

**Cíl:** Systém doporučování uživatelů. Uživatel má unikátní odkaz, vidí statistiky a návod.

**Analýza stavu (FÁZE 1):**
- Tabulka `users` (migrace `001_initial_schema.sql`) má sloupce `id, full_name, avatar_url, plan, language, streak, onboarded, created_at`. Přidání `referral_code` + `referred_by` je přímočaré.
- Trigger `handle_new_user` (`002_auth_trigger.sql`) vytváří řádek `users` při registraci. Rozšířím ho o generování unikátního `referral_code` (retry-loop proti kolizi UNIQUE).
- ⚠️ **Rozdíl oproti zadání:** `settings-sidebar.tsx` je mrtvý komponent (neimportuje se nikde). Reálná navigace podstránek nastavení je v `src/components/dashboard/sidebar.tsx` (`submenuItems`) a `src/components/dashboard/mobile-nav.tsx` (dropdown). Novou položku přidám sem, ne do `settings-sidebar.tsx`.
- Zachycení `?ref=`: email registrace (`emailAuthAction`) i Google OAuth (`auth/callback/route.ts`) vyžadují sjednocený helper `applyReferral(code, userId)`, který po vzniku session doplní `referred_by` (jen pokud je null a není self).
- Odkaz: `https://postio-app.cz/{locale}/login?ref=CODE` (produkční doména dle README).

**Krok 1: Úprava databáze + zachycení ref kódu** `[x]`
- SQL migrace `039_add_referral_system.sql`:
  - `ALTER TABLE public.users ADD COLUMN referral_code TEXT UNIQUE;`
  - `ALTER TABLE public.users ADD COLUMN referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL;`
  - Úprava `handle_new_user` (v `002` nebo nová migrace `040` s `CREATE OR REPLACE`): generování `referral_code` přes LOOP s `upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 6))` a retry při `unique_violation`.
  - RLS: `referred_by` je na vlastním řádku → pokryto existujícími policy (SELECT/UPDATE own row).
- Helper `src/lib/referral.ts`: `applyReferral(code, userId)` – resolve kódu na referrer id (SELECT podle `referral_code`), UPDATE `referred_by` jen pokud null a `referrer_id != userId`.
- Napojení:
  - `email-signin.tsx`: pokud URL obsahuje `?ref=`, uložit do cookie `postio_ref` (přežije i e-mail verifikaci).
  - `emailAuthAction`: po `signUp`/`signIn` přečíst `postio_ref` a zavolat `applyReferral`.
  - `auth/callback/route.ts`: po `exchangeCodeForSession` (Google) přečíst cookie `postio_ref` a zavolat `applyReferral`.
- `npx tsc --noEmit` + manuální test (registrace s `?ref=`, ověření `referred_by` v DB).

**Krok 2: Nová položka v menu nastavení + routa** `[ ]`
- `dashboard/sidebar.tsx`: přidat do `submenuItems.account` položku `{ href: /${locale}/settings/referrals, label: settingsLabels.referrals, icon: Gift }`; přidat `gift: Gift` do `ICON_MAP` a `referalls` do `settingsLabels` typu.
- `mobile-nav.tsx`: stejná položka do `accountLabel` sekce dropdownu + icon `Gift`.
- `dashboard/layout.tsx`: předat `settingsLabels.referrals` (i18n klíč `settings.referrals`).
- Vytvořit `src/app/[locale]/(dashboard)/settings/referrals/page.tsx` (zatím prázdná/server wrapper, který načte `referral_code`, počet referralů a předá do client komponenty z Kroku 3).
- `npx tsc --noEmit` + manuální test (položka viditelná v postranním menu i mobile dropdownu, route funkční).

**Krok 3: UI Referral stránky (Glassmorphism, dle design skillů)** `[ ]`
- `referrals/page.tsx` (server): načte `referral_code`, `count(referred_by = id)` jako "Celkem doporučení", a odvozenou odměnu (počet referralů = počet měsíců PRO zdarma).
- Client komponenta `referral-stats.tsx` s dvěma horními kartami:
  - "Celkem doporučení" (počet uživatelů s `referred_by` = můj id).
  - "Získané odměny" (odvozeno z počtu referralů; copy: za každé doporučení 1 měsíc PRO zdarma).
- Sekce "Váš doporučovací odkaz": input (readonly) s odkazem `https://postio-app.cz/{locale}/login?ref=CODE` + tlačítko "Kopírovat" (`navigator.clipboard`, toast potvrzení).
- Sekce "Jak to funguje": 4 kroky (Zkopírujte odkaz → Sdílejte → Registrace uživatele → Získejte odměnu: měsíc PRO zdarma).
- Design: Pure Black pozadí, radius 20px, glassmorphism, indigo accent, grid pattern, custom cubic-bezier motion, respektovat `prefers-reduced-motion`. Žádné em-dash. Konzistentní s existujícími settings stránkami.
- `npx tsc --noEmit` + manuální test vizuálu a kopírování.

**Krok 4: Lokalizace (cs/en/uk)** `[ ]`
- Přidat klíče do `src/messages/cs.json`, `en.json`, `uk.json` (namespace `settings` nebo nový `referrals`): `referrals`, `referralsDescription`, `totalReferrals`, `rewardsEarned`, `yourLink`, `copy`, `copied`, `howItWorks`, `step1`–`step4`, atd.
- `npx tsc --noEmit` + manuální test všech 3 jazyků.

