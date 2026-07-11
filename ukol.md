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

## 10. **SEKCE - AKTUÁLNÍCH ÚKOLŮ:**

### ✅ Prompt 024 – Integrace platební brány Stripe a předplatného

**Cíl:** Napojit ceník (`/settings/billing` i landing page) na Stripe, aby uživatelé mohli přejít z free na creator/pro a změny se propsaly do DB.

- [x] **Krok 1 – Příprava databáze:** Vytvořit SQL migraci (035) přidávající sloupce `stripe_customer_id TEXT`, `stripe_subscription_id TEXT`, `subscription_status TEXT` a `trial_ends_at TIMESTAMPTZ` do tabulky `public.users`. Aktualizovat TypeScript typy.
- [x] **Krok 2 – Stripe Checkout API Route:** Vytvořit API route `POST /api/stripe/checkout`, která přijme `priceId` a `plan` (creator/pro), vytvoří Stripe Checkout Session pro přihlášeného uživatele a vrátí URL pro přesměrování. Nainstalovat `stripe` npm balíček.
- [ ] **Krok 3 – Stripe Webhook Handler:** Vytvořit API route `POST /api/webhooks/stripe` pro příjem událostí `checkout.session.completed`, `customer.subscription.updated` a `customer.subscription.deleted`. Při `checkout.session.completed` nastavit `plan` a `stripe_subscription_id` v DB. Při `customer.subscription.deleted` vrátit `plan` na `free`.
- [ ] **Krok 4 – Customer Portal:** Vytvořit API route `POST /api/stripe/portal`, která vygeneruje link do Stripe Billing portálu (správa karty, zrušení předplatného). Přidat tlačítko "Spravovat předplatné" do `/settings/billing`.
- [ ] **Krok 5 – UI propojení:** Napojit tlačítka v `billing-card.tsx` na Stripe Checkout API s loading stavy (useTransition/useActionState). V pricing-section.tsx na landing page přesměrování na `/login` (při existujícím účtu) nebo na Checkout. Přidat env vars do `.env.local` (template) a promítnout do dokumentace.