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

## 🐦 Prompt 031-X — Hybridní X režim (Manuální připomínky pro X)

**Kontext:** Kvůli ceně oficiálního X API ($200+) nevynucujeme pro start automatické odesílání.
Zavádíme „Hybridní X režim": uživatel si připojí X manuálně (zdarma, jen `@jméno`) a Postio mu v
naplánovaný čas připraví podklady (text + obrázek) v sekci „K vyřízení" místo volání API. Stávající
X OAuth kód se PONECHÁ, ale v UI se dočasně skryje / označí „Experimental / Připravujeme".

**Co už v kódu existuje (migrace 036, Prompt 026):** sloupec `social_accounts.publishing_type`
('direct' | 'manual', default 'direct') a status `post_platforms.status = 'ready'` (připraveno
ke zveřejnění). Ve `types.ts` i `/api/accounts` route je `publishing_type` už přítomen. Chybí:
rozcestník v UI, uložení manuálního X účtu BEZ tokenu, větev v publish scheduleru a sekce „K vyřízení".

**Dotčené soubory (analýza):**
- `src/app/[locale]/(dashboard)/accounts/page.tsx` — klik na `twitter` → `onConnect` směřuje na OAuth (`/api/accounts/x`).
- `src/app/api/accounts/x/route.ts` — X OAuth (PKCE). PONECHAT, skrýt v UI.
- `src/app/api/accounts/route.ts` — POST umí legacy manuální insert (vyžaduje `accessToken`); GET vrací `publishing_type`.
- `src/components/connect-account-modal.tsx` — univerzální modal (zatím jen OAuth cesta).
- `supabase/functions/process-scheduled-posts/index.ts` — edge scheduler volá publish per platformu.
- `src/app/[locale]/(dashboard)/dashboard/page.tsx` — cíl pro sekci „K vyřízení".

### Krok 1 — Rozcestník pro X (modál) ✅
- [x] V `accounts/page.tsx` zachytit klik na `platform.id === "twitter"` a otevřít NOVÝ `XConnectModal`
      (místo univerzálního `ConnectAccountModal`). Pro ostatní sítě zůstává stávající chování.
- [x] Nový `src/components/x-connect-modal.tsx` (design dle manuálu: glassmorphism, `rounded-[20px]`, indigo):
      - **Tlačítko A** „Osobní / Manuální (Zdarma)" → zobrazí input na `@uživatelské_jméno` → po odeslání
        volá `POST /api/accounts` s `{ platform: "twitter", accountName, publishingType: "manual" }` (BEZ tokenu).
      - **Tlačítko B** „Automatické odesílání (Připravujeme)" → `disabled`, zašedlé, badge „Připravujeme" / „Experimental".
- [x] Při úspěchu obnovit seznam účtů (`fetchAccounts()`) + toast.

### Krok 2 — Uložení manuálního X účtu (API)
- [ ] `src/app/api/accounts/route.ts` (POST): přijmout `publishingType`. Pokud `publishingType === "manual"`,
      NEvyžadovat `accessToken` (povolit chybějící/prázdný); uložit řádek s `publishing_type: "manual"`,
      `account_name` = `@jméno`, `platform_id: null`, `is_active: true`. Zachovat deduplikaci na
      `(user_id, platform)` s `platform_id IS NULL`.
- [ ] `publishing_type` je v DB z migrace 036 → žádná nová migrace není potřeba.

### Krok 3 — Logika publish pro manuální X (K vyřízení)
- [ ] `supabase/functions/process-scheduled-posts/index.ts`: před voláním publish pro `twitter` načíst
      `social_accounts.publishing_type`. Pokud `'manual'` → NEN volat API; nastavit `post_platforms.status = 'ready'`
      (připraveno ke zveřejnění) a ponechat `scheduled_at`. Ostatní platformy běží dál.
- [ ] Nová sekce „K vyřízení" v `dashboard/page.tsx`: seznam postů s `post_platforms` status `'ready'`
      pro `twitter`. Pro každý: tlačítko „Kopírovat text" (schránka) + „Stáhnout obrázek" (odkaz na `media_urls`).
- [ ] Volitelně: u manuálního X účtu v seznamu Účtů badge „Manuální připomínka".

### Krok 4 — Lokalizace (cs / en / uk)
- [ ] `src/messages/{cs,en,uk}.json` (namespace `accounts` + `dashboard`): klíče
      `xConnect.title`, `xConnect.manualButton`, `xConnect.manualDesc`, `xConnect.autoComingSoon`,
      `xConnect.usernamePlaceholder`, `xConnect.manualSaved`, `dashboard.todoTitle`, `dashboard.copyText`,
      `dashboard.downloadImage`, `dashboard.manualReminder`.

