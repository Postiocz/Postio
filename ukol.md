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
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden poslední `git commit` (Pravidlo 4), u posledního kroku z Aktuálních úkolů, tak smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce) a nadpis ## 11. AKTUÁLNÍ ÚKOLY. Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

8. **DODRŽOVÁNÍ DESIGN MANUÁLŮ (Taste Skill)**:
   Kdykoliv vytváříš, upravuješ nebo navrhuješ vizuální část aplikace (UI komponenty, Tailwind třídy, layout, landing pages), jsi bezpodmínečně POVINEN si nejprve načíst a striktně aplikovat designová pravidla z těchto dvou souborů:
     1. .agents/skills/design-taste-frontend/SKILL.md
     2. .agents/skills/high-end-visual-design/SKILL.md
       Náš cíl je prémiový, moderní, vzdušný vzhled (Premium Glassmorphism) přesně podle těchto manuálů.

9. **PRAVIDLA V UKOL.MD - ZÁKAZ ÚPRAV A MAZÁNÍ PRAVIDEL**:
   "Za žádných okolností nesmíš smazat nebo upravovat pravidla v ukol.md"

10. **KONTROLA GIT VĚTVE PŘED ÚPRAVOU KÓDU**:
    Před JAKOUKOLIV úpravou kódu vždy nejdřív zkontroluj aktuální git větev (`git branch --show-current` nebo ekvivalent). Pokud jsi na `main`, NESMÍŠ rovnou editovat – místo toho:
    a) Navrhni vhodný název nové pracovní větve podle řešeného úkolu/problému (např. `fix/notifications-link`, `feature/target-accounts`).
    b) Vytvoř tuto větev a přepni se na ni (`git checkout -b <název>`).
    c) Teprve pak pokračuj v editaci podle běžného workflow (jeden krok, stop, schválení).
    Pokud už jsi na jiné než main větvi, pokračuj normálně bez vytváření nové.

---

## 11. AKTUÁLNÍ ÚKOLY

### 🐛 ÚKOL: FB Preview přetéká přes okraje karty (editor náhledu) ✅

- **Kontext (2026-09-13):** V editoru postu (Preview panel) má Facebook záložka vizuální bug – obrázek/podklad přetéká přes zaoblené okraje karty náhledu (hrany fotky nesou zarovnané s `rounded` rohy karty), na rozdíl od Instagram záložky, která je v pořádku.
- **Analýza:** komponenta `post-preview.tsx` – `MediaArea` (r. 812) má `overflow-hidden` ale bez `border-radius`; FB article (r. 864) má `rounded-lg` ale bez `overflow-hidden` → ostré rohy media přetékajу mimo zooblené rohy karty. IG je v pořádku, protože media leží flush k vnější karte viewportu (`rounded-[20px] overflow-hidden`, r. 244).
- **Oprava (✅ testováno):** FB media wrappovaná v `overflow-hidden rounded-lg`; LinkedIn media (`rounded-lg` article) dostala `rounded-lg` na wrapper (stejný latentní bug). Diff: post-preview.tsx r. 891 + r. 1153.

### 🐛 ÚKOL v2: FB/LinkedIn Preview – portrétový obrázek s tmavým okrajem (letterboxing) ⏳

- **Kontext (2026-09-13):** Po opravě přetékání vizuální test ukázal: kolem portrétového obrázku v FB a LinkedIn náhledu je vidět nechtěný tmavý okraj/pruh po stranách – obrázek nevyplňuje šířku karty tak, jak na reálné síti. IG tab je v pořádku.
- **Analýza:** řéšit – jak se řeší object-fit / šířka kontejnera pro portrétové obrázky (`w-full h-auto object-contain` v MediaArea vs IG). Potenciální příčina: `object-contain` lityczne + kontejner bez aspekt-ratio → při portrétu vzniká letterbox. Zhoduj s IG.
- **Oprava:** navrhni (needituj kód, dokud neschválím).

### 🎯 ÚKOL: Jednotná per-platform validace médií (všech 6 platforem)

**Problém / stav 2026-09-13:** Validace médií je dnes fragmentovaná a platforma-specifická (neexistuje vlastně, mimo dvou obecných checků):

- Obecná MIME allow-list (JPEG/PNG/WEBP image, MP4/MOV video) v `src/lib/constants.ts`, aplikovaná při přidání souboru v `src/hooks/use-media-upload.ts` (`addFiles`).
- Obecná velikostová ochrana: `MAX_VIDEO_SIZE` 50 MB, `ABSOLUTE_HARD_LIMIT` 50 MB (tamté).
- Obecné varování nízkého rozlišení video: `MIN_VIDEO_DIMENSION = 640` (toast `videoLowResolution`).
- IG-specific: `getInstagramIncompatibleVideos` (video s kratší stranou <640 px) → rose banner + disable Publish/Schedule v obou editorach (`posts/new/page.tsx`, `components/edit-post-dialog.tsx`).
- Platform-vyžadující checky presence: `isPlatformMediaRequirementMet` (tiktok/youtube → video, instagram → jakékoli médium), tooltipy.

**⚠️ DŮLEŽITÉ ZJIŠTĚNÍ:** Pravidlo „IG = JPEG-only + poměr stran 4:5–1.91:1" existuje JEN v CLAUDE.md/AGENTS.md (`## 📱 Sociální sítě – UI/UX & API pravidla`, bod 2 „Validace médií"). **V KÓDU TU VALIDACI NENÍ ANI IMPLEMENTOVANÁ** — žiaden kód nekontroluje formát/poměr obrazu per-platform.

**Oficiální požadavka (ověřeno z dokumentace 2026-09-13):**

| Platforma | Format obrázků | Max velikost obr. | Poměr obrázků | Format videí | Max délka videí | Max velikost videí | Pozn. |
|---|---|---|---|---|---|---|---|
| Facebook | jpeg/bmp/png/gif/tiff | 10 MB (png doporuč. <1 MB) | — | MP4/MOV | do 240 min | 10 GB | Graph API Page Photos |
| Instagram | jpeg/png | 8 MB (organic) | feed 4:5·1:1·1.91:1; story 9:16 | MP4/MOV | 3 s–60 min (Reels 3 min) | 4 GB | feed ratio z CLAUDE.md 4:5–1.91:1 ✓ |
| LinkedIn | jpeg/gif/png | <36 MP px | 1:1 nebo 2.4:1 vid. | MP4/MOV/AVI/WebM/MKV | do 10 min | <200 MB (jedno; nad = multipart) | Assets API; v Postio v1 **video NEní podporované** (error) |
| YouTube | — | — | 16:9 default (4:3 kategori) | MP4/MOV/AVI/WMV/WebM… | do 12 h | 256 GB | Shorts 9:16/1:1 do 3 min |
| X (Twitter) | jpg/png/gif | 5 MB (gif 15 MB) | 16:9, 1:1 (+portrait 9:16) | MP4/MOV (H.264/AAC) | 0.5–140 s | 512 MB | X publish v Postio = „ready" (manual, bez API) |
| TikTok | jpg/png (photo) | — | 9:16 (i 1:1, 16:9) | MP4/MOV | do 3 min (10 min ze zdroja) | 72–278 MB (in-app) | min rez. 540×960 |

**Návrh obecného mechanismu:**

1. **Čistá per-platform politika** (`src/lib/media/platform-policies.ts`, pure TS, bez deps):
   ```
   type MediaPolicy = {
     platformId: string;
     requires: "image" | "video" | "any" | "none";
     allowedImageTypes: string[];   // MIME
     allowedVideoTypes: string[];
     maxImageBytes?: number;
     maxVideoBytes?: number;
     minRatio?: number;             // width/height
     maxRatio?: number;
     minDimension?: number;         // px, klatší strana
     maxDurationSec?: number;
     maxFiles?: number;             // počet médií na post
     notes?: string;                // i18n návrh
   };
   function validateMediaForPolicy(mediaItems, policy): ValidationIssue[];
   ```
   Registry pro všechny 6 + sdílená cnt funkce. Staré konstanty (`MIN_VIDEO_DIMENSION` a spol.) se přesunou sem jako výchozí/politiky.

2. **Klientová validacia sdílena** – jeden validator používaný OBA editora (posts/new + edit-post-dialog), místo dnešní IG-only logiky.

3. **UI štítek u KAŽDEJ vybranej platformy** – malý status odznak na chipu platformy (✓ zelený / ⚠ oranžový / ✕ červený) + tooltip s krádkým „čo nejsedí", plus místo IG-only banner: konsolidované varování s vypsanými všíemi problémovými platformami.

4. **Server-side pre-flight** v `publish.ts` (a scheduled Edge Function) – dřím pomocou stejných politik, skip + explicitní error pres silent-fail (stejný princip jako accountMap fix).

5. **i18n** – nové klíče per-platform (cs/en/uk); CHANGELOG záznam; aktualizace CLAUDE.md/AGENTS.md „Bibla pravidel" k markeru realizováno + shoda s realnou (JPEG-only nuance – IG akceptuje i PNG).

**Dílčí kroky (pořadě):**
- ✅ **KROK 1** – `platform-policies.ts` registry (všech 6 platforem) + validator fn (pure, názadno testovatelné). Bez UI.
- ✅ **KROK 2** – Zapojenie validatoru do `posts/new` editoru: platform badge + tooltip + konsolidovane varování (IG banner proho environment zamění obecný, ale zobrazuje se pro každú vybr. platformu).
- ✅ **KROK 3** – Stejné do `edit-post-dialog` (extrakce sdílené komponenty `PlatformMediaBadge` – `src/components/platform-media-badge.tsx`, používaná obojí editorom).
- ✅ **KROK 4** – Server-side pre-flight v `publish.ts` (+ poznámka pro scheduled Edge Function), skip + explicit error.
- **KROK 5** – i18n (cs/en/uk), CHANGELOG, aktualizace CLAUDE.md/AGENTS.md „Bibla pravidel".
- **Ověření každého kroku:** `npx tsc --noEmit` + manuál test v UI editoru.

