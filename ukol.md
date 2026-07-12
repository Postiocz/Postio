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
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden `git commit` (Pravidlo 4), smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce). Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLU (Taste Skill):**
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
    1. .agents/skills/design-taste-frontend/SKILL.md
    2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL:**
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"**

 ---

## 10. AKTUÁLNÍ ÚKOLY

### 📋 Prompt 026 (Podpora osobních profilů a manuálního publikování s připomínkou)

**Cíl:** Umožnit propojit i osobní profily (zejm. Instagram, Facebook), které nepodporují
automatické odesílání přes API. Tyto účty dostanou `publishing_type = 'manual'` a Postio
nabídne „Manuální publikování" (příprava podkladů + připomínka v daný čas).

**Analýza existujícího kódu (Fáze 1 – hotovo):**
- `social_accounts` (supabase/migrations/001, 011, 012, 029 + src/lib/supabase/types.ts:76): sloupce `id, user_id, platform, account_name, access_token, platform_id, avatar_url, token_expires_at, is_active, metadata`. ŽÁDNÝ `publishing_type`.
- `post_platforms.status` CHECK (migrations/023, 031): `(...'draft','scheduled','publishing','published','failed','removed_externally','archived')`. Chybí `'ready'`.
- Připojování účtů: `src/app/[locale]/(dashboard)/accounts/page.tsx` → `ConnectAccountModal` (`onConnect`). Instagram/Facebook jdou přes `supabase.auth.signInWithOAuth({ provider: 'facebook', ... })`, LinkedIn/X/YouTube/TikTok přes vlastní API routy.
- Publish motor: `src/lib/actions/publish.ts` (`publishPost`, `publishAdditionalPlatforms`) + Edge fn `supabase/functions/process-scheduled-posts/index.ts`. Obě volají API podle `targetPlatform` a zapisují `status='published'`/`'failed'`. NEZNÁJÍ pojem „manuální".
- Editor: `src/components/edit-post-dialog.tsx` → `PLATFORMS` (ř. 53), `PlatformIconMap` (ř. 44), ikony platforem vykresleny na ř. 1734, 2023, 2320.
- Dashboard: `src/app/[locale]/(dashboard)/dashboard/page.tsx`.

---

#### ✅ Krok 1 — DB Migrace (sloupec `publishing_type` + nový status `ready`)
- **Soubory:** nový `supabase/migrations/036_add_publishing_type.sql`, úprava `src/lib/supabase/types.ts`.
- **Akce:**
  1. `ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS publishing_type TEXT NOT NULL DEFAULT 'direct' CHECK (publishing_type IN ('direct','manual'));`
     - `DEFAULT 'direct'` = existující účty se nemění, zpětně kompatibilní.
  2. Rozšířit `post_platforms_status_check` o hodnotu `'ready'` (migrace 031 mustr):
     `DROP CONSTRAINT IF EXISTS post_platforms_status_check; ADD CONSTRAINT post_platforms_status_check CHECK (status IN (...,'ready'));`
     - `'ready'` = „Připraveno ke zveřejnění" (manuální post čeká na akci uživatele).
  3. `types.ts`: přidat `publishing_type?: 'direct' | 'manual'` do `Row/Insert/Update` u `social_accounts`. (post_platforms status je string, žádná union změna nutná.)
- **Ověření:** `npx tsc --noEmit`, spuštění migrace na Supabase.

#### ✅ Krok 2 — Rozcestník při připojování (volba Profilu)
- **Soubory:** `src/components/connect-account-modal.tsx`, `accounts/page.tsx` (`onConnect`), OAuth routy (instagram/facebook + případně linkedin/x/youtube/tiktok).
- **Akce:**
  1. Do `ConnectAccountModal` přidat mezikrok (pouze pro Instagram + Facebook, kde osobní profily dávají smysl): „Profesionální účet (Automaticky)" vs „Osobní účet (Manuálně s připomínkou)".
  2. Volba se uloží do stavu a předá do OAuth redirectu (query param `publishing_type=direct|manual`, nebo uložení do cookie/pending stavu před redirectem).
  3. V OAuth callbacku (upsert do `social_accounts`) zapsat `publishing_type` z volby.
- **Poznámka:** Instagram osobní profil přes Basic Display nedostane `instagram_content_publish` scope → publish motor ho musí detekovat jako `manual` a API nevolat (viz Krok 4).
- **Ověření:** `npx tsc --noEmit`, manuální test připojení v prohlížeči.

#### ✅ Krok 3 — Vizuální indikátory v Editoru (⚡ / 🔔)
- **Soubory:** `src/components/edit-post-dialog.tsx` (+ načtení `publishing_type` u účtů).
- **Akce:**
  1. Editor si vytáhne seznam účtů s `publishing_type` (existující fetch v dialogu + doplnit pole).
  2. Ke každé ikoně platformy (ř. 1734, 2023, 2320) přidat malý odznáček: ⚡ pro `direct`, 🔔 pro `manual`.
  3. Tooltip s vysvětlivkou („Automatické publikování" / „Manuální – s připomínkou").
- **Design:** dodržet Premium Glassmorphism (načíst `.agents/skills/design-taste-frontend/SKILL.md` + `high-end-visual-design/SKILL.md` dle Pravidla 8).
- **Ověření:** `npx tsc --noEmit`, vizuální test v prohlížeči.

#### Krok 4 — Logika „Odesílání" (manuální = neodesílat na API)
- **Soubory:** `src/lib/actions/publish.ts` (`publishPost`, `publishAdditionalPlatforms`), `supabase/functions/process-scheduled-posts/index.ts`.
- **Akce:**
  1. Před voláním API pro `targetPlatform` načíst `publishing_type` příslušného aktivního účtu (alias `ilike platform`).
  2. Je-li `publishing_type = 'manual'`:
     - NENÍ voláno žádné API.
     - `post_platforms` řádek dané platformy → `status='ready'`, `scheduled_at` zůstává (slouží jako čas připomínky), `published_at=null`, `external_id=null`, `publish_error=null`.
     - `posts.status` zůstává `'scheduled'` (připomínka platí dál).
  3. Edge fn musí manuální platformy přeskočit (jinak by je v cronu poslala na API a selhala). Stejná větev: místo publish → `status='ready'`.
  4. Dashboard widget (viz níž) agreguje posty s ≥1 `manual` platformou v `status='ready'`.
- **Ověření:** `npx tsc --noEmit`, manuální test (manuální příspěvek se nepošle, objeví se v widgetu).

#### Krok 5 — Akční modál „Zveřejnit nyní"
- **Soubory:** nová komponenta (např. `src/components/manual-publish-dialog.tsx`), dashboard widget z Kroku 4, případně PostCard.
- **Akce (po kliku na manuální post):**
  - (a) Stažení médií (odkaz na `media_urls`).
  - (b) Kopírování textu do schránky (`navigator.clipboard.writeText(finalCaption)`).
  - (c) Tlačítko „Otevřít [síť]" → deep link / web URL dané platformy.
  - Po dokončení uživatelem: možnost označit řádek jako „publikováno ručně" (`status='published'`, `published_at=now`) pro evidenci.
- **Design:** Premium Glassmorphism (Pravidlo 8).
- **Ověření:** vizuální + funkční test v prohlížeči (clipboard, stažení, otevření URL).

#### Krok 6 — Lokalizace (cs / en / uk)
- **Soubory:** `src/messages/{cs,en,uk}.json` (namespace dle kontextu, např. `accounts`, `editor`, `manualPublish`).
- **Klíče:** výběr profilu (Krok 2), popisky odznáčků (Krok 3), stav „Připraveno ke zveřejnění" + widget (Krok 4), texty modálu „Zveřejnit nyní" – stáhnout/kopírovat/otevřít (Krok 5).
- **Ověření:** `npx tsc --noEmit`, kontrola překladů ve všech 3 jazycích.