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

### 🎬 Prompt 062 – Příprava podkladů pro TikTok App Review

**Cíl**: Vypracovat finální podklady pro TikTok revizory (vyžadované pro opuštění sandboxu) a připravit aplikaci na demo nahrávání. Po dokončení se sekce smaže (Pravidlo 7) a `ukol.md` se vrátí na čistá pravidla.

**Analýza TikTok flow (FÁZE 1)**:
- **Login Kit** (`src/app/api/accounts/tiktok/route.ts`): PKCE OAuth, scopes `user.info.basic` + `video.upload` + `video.publish`, redirect `https://postio-app.cz/api/accounts/tiktok`, user info + uložení do `social_accounts`.
- **Content Posting API** (`src/lib/actions/publish-tiktok.ts`): `creator_info/query` → `video/init` → binární upload → `status/fetch` polling; privacy `PUBLIC_TO_EVERYONE` / `MUTUAL_FOLLOW_FRIENDS` / `SELF_ONLY` / `FOLLOWER_OF_CREATOR`.
- **Sandbox limit**: neauditovaná aplikace smí publikovat jen na soukromé účty (`tiktok_sandbox_private_only`, viz `src/lib/tiktok-publish-errors.ts`) a v dev režimu se privacy vynutí na `SELF_ONLY` – demo video tedy musí ukázat i tuto skutečnost.

- [x] ✅ **KROK 1 – TikTok Video Scénář**: Vypracovat detailní technický scénář (screencast) pro demo video, který revizorovi krok za krokem ukáže: (1) propojení TikTok účtu přes OAuth, (2) výběr videa v editoru, (3) nastavení soukromí a ostatních voleb, (4) odeslání a potvrzení publikace. Uložit do `docs/tiktok-review-script.md` (nově vytvořit složku `docs/`).
- [x] ✅ **KROK 2 – Anglická zdůvodnění (Justifications)**: Napsat profesionální odstavce pro TikTok portál (sekce Scopes) vysvětlující důvod oprávnění `video.upload`, `video.publish` a `user.info.basic` – zaměřit se na "User Experience" a "Content Management". Uložit do `docs/tiktok-review-justifications.md`.
- [ ] **KROK 3 – UI Audit pro TikTok**: Projít editor při výběru TikToku a zkontrolovat, že se revizorovi nezobrazí žádné technické texty (chybové kódy API, raw JSON, stash názvy) ani chyby v překladech. Nalezené chyby opravit (kód + `src/messages/{cs,en,uk}.json`).
- [x] ✅ **KROK 3.1–3.3 – Oprava TikTok panelu v editoru nového příspěvku**: `posts/new/page.tsx` zcela postrádal sekci "Nastavení soukromí / Možnosti videa" (na rozdíl od `edit-post-dialog.tsx`). Přidána TikTok infra (state, `creator_info` fetch, `platformMetadata` do všech 3 volání `createPostAction`) + kompletní panel (3 privacy toggle + varování pro sandbox private-only režim) mezi výběr platforem a pole Lokalita. Dále opraveny chyby `MISSING_MESSAGE` – TikTok klíče přesunuty z bloku `calendar` do `posts` v `src/messages/{cs,en,uk}.json`. Ověřeno: `npx tsc --noEmit` ✅ (0 chyb), manuálně potvrzeno uživatelem.
- [x] ✅ **KROK 3.4 – Sandbox fallback pro "Zobrazit na síti" (App Review)**: Předchozí příliš striktní fix (zrušení fallbacku na `publish_id`) odstranil tlačítko úplně – v Sandboxu TikTok vrací `publicaly_available_post_id: null`, takže neexistovalo ID pro odkaz. Nový `src/lib/live-url.ts` (`buildLiveUrlInfo`) vrací odkaz na profil `https://www.tiktok.com/@{username}` + `profileFallback` flag s info textem "V Sandbox režimu odkazujeme na profil…". `publish-tiktok.ts` nyní při status/fetch fallbackuje na `video_id` (sandbox odpověď), i když není "publicly available". Opravena skutečná příčina chybějícího tlačítka v náhledech: `PreviewDialog` nedostával `userId` od `PostCard`/`Calendar` → `loadProfiles` se nespouštěl → TikTok handle nebyl k dispozici. Dialog si nyní uživatele dořeší sám přes `supabase.auth.getUser()` (jako `EditPostDialog`). Tlačítko se zobrazuje VŽDY pro published platformy (dashboard + náhledy Posts/Calendar). Ověřeno: `npx tsc --noEmit` ✅ (0 chyb), manuálně potvrzeno uživatelem.
- [ ] **KROK 4 – Final Cleanup**: Po uživatelově potvrzení, že má podklady stažené, smazat celou sekci Promptu 062 z `ukol.md` (Pravidlo 7), udělat commit (Pravidlo 4) a připravit větev k merge.

