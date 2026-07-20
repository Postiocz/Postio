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

---

## 💱 Prompt 035 – Multi-currency Pricing Engine přes Lookup Keys

**Typ úkolu**: FÁZE 1 = analýza + zápis plánu (žádný kód). Označení podle Pravidla 1 – začínáme jedním schváleným krokem.

**Kontext (zjištěno analýzou kódu):**
Stripe je nastavený přes Lookup Keys: `postio_creator_monthly` (Creator), `postio_pro_monthly` (Pro).
- `src/components/marketing/currency-switcher.tsx` – **už existuje** glassmorphism přepínač (USD | CZK | EUR), bez next-intl (`aria-label="Měna"` natvrdo).
- `src/app/[locale]/(dashboard)/settings/billing/billing-client.tsx` – používá `CurrencySwitcher`, ale default `useState<Currency>("eur")` (ř. 25) → **nerespektuje locale**.
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – posílá `{ plan, locale }` (ř. 59), částka přes `formatPrice` (sans-serif, Pravidlo 8 OK).
- `src/components/marketing/pricing-client.tsx` – Landing používá `CurrencySwitcher` + `font-serif` na cenách (ř. 95) → Pravidlo 8 OK; default opět `"eur"` (ř. 44).
- `src/lib/pricing.ts` – `formatPrice` už řeší symboly (Kč/€/$) a částky podle měny.
- `src/app/api/stripe/checkout/route.ts` – **používá `STRIPE_PRICE_ID_CREATOR/PRO`** (konkrétní priceId, ř. 5–8, 72) → musí se přepsat na lookup_key.

**KROK 1 — Currency Switcher: výchozí měna podle locale** ✅
- Cíl: `cs` → CZK, jinak (en/uk) → EUR.
- Změna: `billing-client.tsx:25` a `pricing-client.tsx:44` – nahradit `useState<Currency>("eur")` za výpočet z `locale` (např. helper `getDefaultCurrency(locale)` v `src/lib/pricing.ts`, nebo inline `locale === "cs" ? "czk" : "eur"`).
- Design: switcher už je glassmorphism; dle Pravidla 8 před úpravou načíst design-taste skill (pokud se mění vzhled).

**KROK 2 — Dynamické UI a Typografie** ⬜ (z většiny HOTOVO)
- Ceny už mění symboly/částky přes `formatPrice` + `currency` prop (závislé na Krok 1).
- Landing = serif (`pricing-client.tsx:95`), aplikace = sans-serif (`billing-card.tsx:119`) → Pravidlo 8 splněno.
- Tento krok vyžaduje jen ověření, že po Kroku 1 se částky přepínají korektně; případná úprava typografie jen pokud by chyběla.

**KROK 3 — Stripe Checkout update (frontend)** ⬜
- `billing-card.tsx` `handleCheckout` (ř. 52–69): posílat do `/api/stripe/checkout` navíc `currency` (z prop) místo konkrétního priceId. `plan.id` zůstává (backend z něj odvodí lookup_key). Nový body: `{ plan, locale, currency }`.

**KROK 4 — Backend logika (lookup keys)** ⬜
- `src/app/api/stripe/checkout/route.ts`: místo `PLAN_PRICE_IDS` mapy vytvořit `LOOKUP_KEYS = { creator: "postio_creator_monthly", pro: "postio_pro_monthly" }`.
- Načíst cenu: `stripe.prices.list({ lookup_keys: [lookupKey], active: true })`, vyfiltrovat `data.find(p => p.currency === currency)` (currency přichází lowercase czk/eur/usd = platný ISO 4217 formát Stripe).
- `line_items: [{ price: targetPrice.id, quantity: 1 }]`; validovat `currency ∈ {czk,eur,usd}`.
- Env `STRIPE_PRICE_ID_CREATOR/PRO` přestat používat (lze později odebrat).

**KROK 5 — Lokalizace přepínače měn** ⬜
- `currency-switcher.tsx`: `aria-label="Měna"` přepsat na next-intl (nový namespace, např. `common.currency` / `billing.currencyLabel`). CZK/EUR/USD ponechat jako kódy (nelokalizují se).
- Doplnit i18n texty do `messages/{cs,en,uk}.json`.



