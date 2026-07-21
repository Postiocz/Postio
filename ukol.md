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

### 📧 Prompt 036 – E-mailová architektura a Reset hesla (2026-07-21)

**Stav analýzy:** Následující položky jsou již v kódu HOTOVÉ (objeveno při analýze):
- ✅ KROK 2 (UI Zapomenuté heslo) – `email-signin.tsx` má plně funkční `mode="forgot"`
- ✅ KROK 3 (Server Action) – `resetPasswordAction` v `auth.ts` volá `supabase.auth.resetPasswordForEmail()`
- ✅ KROK 4 (Stránka pro nové heslo) – `reset-password/page.tsx` + `reset-password-form.tsx` existují
- ✅ KROK 5 (Update hesla) – `updatePasswordAction` v `auth.ts` + formulář v `reset-password-form.tsx`
- ✅ KROK 6 (i18n) – Všechny `auth.*` i `email.*` klíče jsou v cs/en/uk.json

**Co reálně zbývá udělat (respektuje stávající kód):**

- [x] **KROK 1: Systémové adresy v `email.ts`** — Rozšířit `SendEmailOptions` o volitelný parametr `from` a přidat konstanty/sloty pro tři adresy (`noreply@postio-app.cz`, `hello@postio-app.cz`, `info@postio-app.cz`). Upravit `sendTransactionalEmail()` aby přijímal parametr `from` (s fallbackem na `getFromEmail()`).

- [x] **KROK 3B: Vlastní e-mail pro reset hesla přes Resend** — Upravit `resetPasswordAction` v `auth.ts` tak, aby:
  a) Vygenerovala recovery link přes Supabase Admin API (`supabase.auth.admin.generateLink()`) – vyžaduje novou env proměnnou `SUPABASE_SERVICE_ROLE_KEY`.
  b) Místo spoléhání na Supabase Auth email odeslala e-mail sama přes `sendTransactionalEmail()` z adresy `noreply@postio-app.cz` s překlady z namespace `email.passwordReset`.
  c) Zachovala stávající chování: Supabase Auth email se nepošle (deaktivovat template v Supabase konzoli nebo použít vlastní SMTP).

- [ ] **KROK 7: Ověření TS kompilace a finální test** — `npx tsc --noEmit` a kontrola celého flow end-to-end.

**Poznámky:**
- KROK 3 v původním zadání je již implementován jako volání Supabase Auth. Nový KROK 3B přidává možnost posílat vlastní e-mail přes Resend z `noreply@postio-app.cz`.
- `SUPABASE_SERVICE_ROLE_KEY` je třeba přidat do `.env.local` a Vercel env vars (hodnota z Supabase Dashboard → Settings → API → `service_role key`).
- Supabase Auth template pro reset hesla je nutné v Supabase konzoli deaktivovat (Settings → Auth → Templates → Reset Password → smazat obsah), jinak Supabase pošle email dvakrát.
