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

8. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL:**
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"**

---

9. **SEKCE - AKTUÁLNÍCH ÚKOLŮ:**
  📌 Aktuální úkoly

---

## 🧹 Prompt 025 – Úklid a byznys logika na stránce Účty

> Cíl: Vyčistit technický dluh na stránce `accounts` odhalený auditem, než přidáme další funkce.

- [x] **Krok 1 – Vynucení limitu účtů podle plánu (server-side + klientská blokace):**
  Do `POST /api/accounts/route.ts` (a relevantních OAuth routes) přidat kontrolu počtu připojených účtů dle plánu uživatele: Free = 1, Creator = 5, Pro = ∞. Při překročení vrátit chybu a zabránit připojení. Kontrola musí být server-side (klient lze obejít).
  - **Dodatek (klientská blokace, UX):** Na stránce Účty přidat proaktivní UI blokaci – pokud `activeAccounts >= limit`, kliknutí na nepřipojenou platformu NESMÍ zahájit OAuth flow ani otevřít formulář, místo toho `toast.error` s hláškou. Reconnect připojeného účtu povolit (nezvyšuje počet). Hlášku lokalizovat (cs/en/uk) pod klíčem `accountLimitReached`.

- [x] **Krok 2 – Fallback pro nefunkční avatary (`onError`):**
  U `<img>` avatarů (připojené účty ř. ~693 i pending pages ř. ~639) doplnit `onError` handler, který při selhání načtení (403/expirace CDN) zobrazí fallback ikonu platformy místo rozbitého obrázku.

- [x] **Krok 3 – Odstranění mrtvého manuálního token formuláře:**
  Smazat legacy manuální formulář (accountName + accessToken, ř. ~501–594) včetně nepoužívaných stavů, `handleConnect` a zbytečné větve. Žádná platforma ho nepoužívá (vše jede přes OAuth).

- [x] **Krok 4 – Náhrada hardcoded textů za i18n:**
  Nahradit natvrdo psané řetězce klíči z `messages`: `"Načítání…"` (ř. 405) → `accounts.loading`, a odstranit míchané fallbacky typu `t("connecting") || "Connecting..."` a `t("active") || "Aktivní"`. Doplnit chybějící klíče do cs/en/uk.

- [x] **Krok 5 – Očištění `getTokenStatus` (čistý render):**
  Přesunout výpočet token-expiry stavu z render-fáze (`Date.now()` na ř. 195) do `useMemo`, aby render byl čistý a šlo odstranit ESLint disable `react-hooks/purity`.

- [x] **Krok 6 – Ověření reconnect (žádné duplicity):**
  Ověřit, že tlačítko Reconnect u všech platforem (zejména Instagram/TikTok) provádí upsert a nevytváří druhý řádek v `social_accounts`. Případně opravit na upsert dle `(user_id, platform, platform_id)`.

- [ ] **Krok 7 – Zpětná vazba při 0 pending pages:**
  Po návratu z Facebook OAuth (`?fb=connected`) při 0 spravovatelných stránkách zobrazit informativní toast místo tichého smazání query paramu.

