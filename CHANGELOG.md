## 2026-06-15

### Fix – UX sjednocení: Instagram hard-block banner jen u tlačítek (HOTFIX 3)

- **Problém**: Po předchozích opravách (Instagram hard-block + persistence rozměrů) se v `EditPostDialog` zobrazovaly **dvě různá varování** o stejné věci:
  1. **Nahoře** v modalu (ve scrollovací oblasti): krátký červený error banner „Toto video nelze na Instagramu publikovat." – generovaný přes `setError(msg)` v `handlePublishAdditional`. Uživatel ho viděl, ale pak scrolloval k tlačítkům a nevěděl, co se změnilo.
  2. **Dole** u tlačítek: velký banner s detailním vysvětlením a doporučeným rozlišením – ale ten se nezobrazoval ve větvi pro **již publikované** posty (větev `isEdit && isAnyPublished`), takže tam zůstalo jen to horní krátké upozornění.
- **Výsledek**: nekonzistentní UX – v `posts/new` a `posts/[id]` se zobrazoval banner dole, ale v `EditPostDialog` (kde se řeší „přidat Instagram k existujícímu postu") byl navíc ještě krátký banner nahoře, což působilo zmateně.
- **Oprava** (`src/components/edit-post-dialog.tsx`):
  - **Sjednocení banneru**: Instagram hard-block banner (`AlertTriangle`, růžový, hlavní text + hint) je nyní **renderován jen jednou**, vně jakékoliv větve `isEdit && isAnyPublished` vs. `:`. Leží v `<div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-3">` – tedy v dolní části modalu, **před všemi akčními tlačítky** (ať už se jedná o tlačítka pro nový post, nebo pro dodatečné publikování).
  - **Odstranění `setError` v IG-specifickém bloku `handlePublishAdditional`**: místo toho se volá jen `toast.error(msg)`. Důvod: `setError` by vytvořil **druhý** banner nahoře v modalu, což je přesně to, co si uživatel nepřál. Jednotný banner dole + toast jsou dostatečnou zpětnou vazbou.
  - **Banner je nyní konzistentní ve všech třech formulářích** (`EditPostDialog`, `posts/new`, `posts/[id]`) – vždy dole u tlačítek, vždy se stejným textem a ikonkou.
- **`posts/new/page.tsx`, `posts/[id]/page.tsx`**: beze změny – jejich banner byl od začátku dole u tlačítek.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - V `EditPostDialog` pro již publikované posty s IG-konfliktním videem se nyní zobrazuje **velký banner dole** (s hintem), ne krátký nahoře.
  - Kliknutí na „Publikovat na Instagram" u takového postu nyní vyvolá **toast + zvýraznění existujícího banneru** (protože tlačítko je disabled), žádný duplicitní banner nahoře.
  - Konzistentní vizuální jazyk ve všech třech formulářích: vždy 1× banner, vždy dole, vždy se stejnými texty.

### Fix – Instagram hard-block se nyní aplikuje i u dodatečného publikování (HOTFIX)

- **Problém**: Po předchozí opravě (hard-block při výběru Instagramu v editoru) se projevil nový use case: uživatel publikuje příspěvek s nízkorozlišenovým videem **nejprve na Facebook** (kde to projde), a pak se rozhodne přidat **Instagram** jako další platformu přes tlačítko „Publikovat na Instagram" v `EditPostDialog`. V tu chvíli se `handlePublishAdditional` volal bez kontroly rozlišení, request proletěl až do `publishAdditionalPlatforms` → `publishToInstagram` → Graph API container → po 9 polling pokusech opět `status_code: ERROR` s `2207082`. Server-side latence ~29 s, pak teprve chyba.
- **Příčina**:
  1. Rozměry videa (`dimensions` na `MediaUploadItem`) se v hooku nastavovaly **pouze během uploadu v aktuální session**. Po otevření existujícího postu (nebo refreshi stránky) se `loadExistingUrls()` rehydratoval `items` z remote URL bez `dimensions`. V důsledku `getInstagramIncompatibleVideos()` vracel prázdné pole a `isInstagramVideoIncompatible` byl vždy `false`.
  2. `handlePublishAdditional` nekontroloval IG kompatibilitu vůbec – spoléhal na to, že se kontrola provedla při výběru platformy v době vytváření postu. U „dodatečného" přidávání platformy se ale `platforms` state nemění, takže useMemo `isInstagramVideoIncompatible` se vyhodnocoval jen z `platforms`, ale `platforms` v tu chvíli Instagram typicky neobsahoval (byl jen v `post.post_platforms`).
- **Oprava**:
  - **`src/hooks/use-media-upload.ts`**:
    - Nová interní utilita `getVideoDimensionsFromUrl(url)` – stejný princip jako `getVideoDimensions(file)`, ale pracuje s remote URL. Používá `<video preload="metadata">`, takže stahuje jen hlavičku (řádově KB), ne celé video.
    - Nový `useEffect` po změně `items`: najde videa, která jsou `status === "ready"`, mají `url`, ale nemají `dimensions`, a asynchronně je doplní přes `getVideoDimensionsFromUrl`. Tím se `dimensions` rekonstruují i u postů otevřených po refreshi, nebo u videí nahraných v předchozí session. Pokud browser metadata nepřečte (CORS, broken file), tiše se vzdá – bezpečnější než blokovat stránku.
    - Hook stále **neukládá dimensions do DB** (žádná migrace). Funguje to proto, že browser umí přečíst metadata z libovolné dostupné URL.
  - **`src/components/edit-post-dialog.tsx`**:
    - `handlePublishAdditional(targetPlatform)` nyní hned na začátku kontroluje `targetPlatform === "instagram" && isInstagramVideoIncompatible`. Pokud ano, nastaví se `error`, zobrazí se toast se stejnou zprávou jako v banneru a akce se přeruší ještě před zavoláním `publishAdditionalPlatforms`.
    - `useMemo isInstagramVideoIncompatible` se nově vyhodnocuje **i pro `post.post_platforms`**, ne jen pro aktuální `platforms` state – tedy pokud je Instagram už publikovaný nebo se chystá publikovat, kontrola se aktivuje. (Tím se pokryje i případ, kdy `platforms` v daném renderu ještě Instagram neobsahuje, ale `targetPlatform` ho posílá do `publishAdditionalPlatforms`.)
  - **`src/app/[locale]/(dashboard)/posts/[id]/page.tsx`**: tato stránka nemá `handlePublishAdditional` (veškeré publikování jde přes `handleSave` + `status === "published"`), kde už IG kontrola je. Beze změny.
- **Bezpečnost / Data**: Žádné DB změny (žádná migrace). Žádné nové API routes. Žádné nové npm závislosti. Hook používá `crossOrigin = "anonymous"` pro `<video>` element, takže CORS preflight jde přes Supabase Storage – funguje bez další konfigurace.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Po otevření existujícího postu (nebo refreshi) se rozměry videí zrekonstruují z remote URL během cca 100–500 ms (závisí na velikosti hlavičky). Uživatel nepozná žádný rozdíl.
  - Dodatečné přidání Instagramu k postu s nízkorozlišenovým videem nyní rovnou zobrazí srozumitelnou chybu („Toto video nelze na Instagramu publikovat. Instagram nepodporuje videa s nízkým rozlišením…") – žádný 30s let na server, žádná kryptická `2207082`.
  - Pokud browser metadata nepřečte (CORS, chybný soubor), kontrola se neaplikuje a server může stále selhat – to je akceptovatelné (graceful degradation) a mnohem lepší než fallback na chybný false-positive blok.

### Feature – Hard-block Instagram publikování u videí s nízkým rozlišením (DOKONČENO)

- **Cíl**: Zabránit opakovanému selhávání `error_subcode 2207082` u Instagram Reels, když video má kratší stranu < 640 px. Facebook tyto videa akceptuje, Instagram ne – a dříve se chyba projevila až v Graph API kontejneru s textem `Media upload has failed with error code 2207082`, který uživatele nijak nepomohl.
- **Kontext z testu**: Video 576 × 1024 px (Download.mp4) prošlo na Facebook bez problémů, ale na Instagramu končilo s `status_code: ERROR` po cca 9 polling pokusech. Po přegenerování do 1080 × 1920 (nebo alespoň 720 × 1280) potíže zmizí.
- **`src/hooks/use-media-upload.ts`**:
  - `MediaUploadItem` rozšířen o `dimensions?: { width: number; height: number }`. Rozměry se zjišťují v již existující utilitě `getVideoDimensions()` po uploadu a perzistují se do state (dříve se jenom zobrazoval soft warning a výsledek se zahazoval).
  - Nový helper `getInstagramIncompatibleVideos(): MediaUploadItem[]` – vrací všechna videa, jejichž kratší strana je menší než `MIN_VIDEO_DIMENSION` (640 px). Neurčeno (např. upload ještě probíhá nebo se nepodařilo dekódovat) se nepočítá jako nekompatibilní.
  - Helper je součástí return objektu hooku, takže ho mohou snadno konzumovat všechny tři formuláře.
- **`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`** – tři místa, kde se skládá post:
  - Destructuring `getInstagramIncompatibleVideos` z hooku.
  - Nový `useMemo` `isInstagramVideoIncompatible` – true, pokud je Instagram ve vybraných platformách a existuje alespoň jedno nekompatibilní video.
  - **Hard-block banner** (růžový, `border-rose-500/30`, `AlertTriangle` ikona, `role="alert"`):
    - Hlavní text: **„Toto video nelze na Instagramu publikovat."**
    - Vedlejší text: **„Instagram nepodporuje videa s nízkým rozlišením (minimálně 640 × 1138 px). Přegenerujte prosím video ve vyšším rozlišení (doporučeno 1080 × 1920 px)."** – formulováno jako omezení platformy, nikoliv aplikace.
    - Banner se zobrazuje **pouze** když je `isInstagramVideoIncompatible === true` a dané tlačítko se chystá publikovat (tj. je vybrán Instagram).
  - **Blokace tlačítek**: Tlačítka „Publikovat" a „Naplánovat" (resp. „Save" u `posts/[id]`, pokud je `status === 'published' || 'scheduled'`) mají v `disabled` nový predikát `isInstagramVideoIncompatible`. Tlačítko „Uložit koncept" zůstává aktivní – chceme umožnit uložení nehotového návrhu.
  - **Defense in depth v handlerech**: I kdyby se tlačítko nějak obešlo, kontrola se opakuje v `handleSubmit("scheduled")`, `handlePublishNow` a `handleSave` – při pokusu se zobrazí toast se stejnou zprávou a akce se přeruší.
  - **Title u disabled tlačítek**: `title` atribut se nastaví na text banneru, takže při najetí myší uživatel vidí důvod.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 2 nové klíče přidané v obou sekcích (`common` i `posts`):
  - `instagramVideoTooSmall` – hlavní text banneru.
  - `instagramVideoTooSmallHint` – vysvětlení a doporučené rozlišení.
  - Anglické/ukrajinské verze jsou formulovány stejně jako omezení platformy.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti. Server-side kontrola v `publish.ts` zůstává pro klid v duši na svém místě (kdyby klient nějak obešel UI) – chybová hláška z `publishToInstagram` je teď pro uživatele relevantnější, protože se tam dostane jen přes bypass UI.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Uživatel dostane srozumitelnou hlášku **před** selháním API: „Instagram nepodporuje videa s nízkým rozlišením…" – ne kryptickou `2207082`.
  - Uživatel nemůže omylem naplánovat post, který by v naplánovaném čase selhal.
  - Pokud omylem publikuje jen na Facebook (kde video projde), stále to funguje – Instagram kontrola se aktivuje jen když je Instagram ve vybraných platformách.
  - U draftu zůstává tlačítko „Uložit koncept" aktivní, aby mohl uživatel dokončit ostatní části postu a vrátit se k videu později.

### Feature – Přísná validace médií při nahrávání (DOKONČENO)

- **Cíl**: Zabránit chybám typu Meta subcode `2207082` tím, že do aplikace nepustíme soubory s nepodporovanými kodeky (`.gif`, `.svg`, `.avi`, `.mkv`, `.bmp`…) nebo s příliš velkou velikostí. Dosud se takové soubory buď tiše propustily do uploadu, nebo se velikost kontrolovala zastaralým limitem 20 MB pro videa.
- **`src/lib/constants.ts`** (NOVÝ) – centrální definice limitů pro média:
  - `ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']` – striktní seznam; **GIF a SVG byly záměrně vyřazeny** (nejsou akceptovány všemi sociálními sítěmi a vedly ke kryptickým API chybám).
  - `ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']`.
  - `MAX_VIDEO_SIZE = 50 * 1024 * 1024` (50 MB) – nový, vyšší limit pro videa.
  - `ABSOLUTE_HARD_LIMIT = 50 * 1024 * 1024` – absolutní strop pro cokoliv.
  - `MIN_VIDEO_DIMENSION = 640` – Meta standard pro minimální rozlišení videa.
  - Soubor je čistý (žádný React/Next/Supabase) → importovatelný jak ze serveru, tak z klienta.
- **`src/hooks/use-media-upload.ts`**:
  - Přesunuty konstanty do `@/lib/constants` (žádné duplicitní definice).
  - Nová striktní logika v `addFiles()` v pořadí:
    1. **Formát**: Pokud MIME typ není v `ALLOWED_IMAGE_TYPES` ∪ `ALLOWED_VIDEO_TYPES`, soubor je okamžitě odmítnut a zobrazí se toast s konkrétním typem: `Formát {type} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV.` Jeden toast na každý odmítnutý soubor (typ se bere z `file.type`, fallback na příponu nebo `"unknown"`).
    2. **Velikost videa**: Pokud `video/*` soubor překročí 50 MB, je tvrdě odmítnut ještě před zahájením uploadu → toast `Video je příliš velké (max. 50 MB). Zmenšete ho prosím.`
    3. **Hard cap pro obrázky**: Obrázky > 50 MB jsou odmítnuty (stávající chování, ponecháno).
    4. **Obrázky > 5 MB** – beze změny, putují do fáze `optimizing` (auto-komprese) a poté do uploadu.
    5. **Low-resolution warning pro videa**: Po úspěšném uploadu (paralelně, neblokující) se přes novou utilitu `getVideoDimensions(file)` zjistí rozměry videa; pokud je kratší strana < 640 px, zobrazí se **soft warning** toast `Video má nízké rozlišení (méně než 640 px). Na sociálních sítích může vypadat rozmazaně.` Upload se NEPŘERUŠUJE – uživatel se může rozhodnout soubor vyměnit.
  - Nové labely v `MediaUploadLabels`: `unsupportedFormat` (funkce přijímá `{type}` pro ICU placeholder), `videoTooLarge`, `videoLowResolution`. Kvůli `FORMATTING_ERROR` z next-intl jsou tyto ICU zprávy předávány jako **funkce** (viz paměťový záznam v AGENTS.md).
  - Nová interní utilita `getVideoDimensions(file)` v hooku – vytvoří dočasný `<video>` element, parsuje `videoWidth`/`videoHeight` z `loadedmetadata`, vždy uvolní object URL.
  - Z checku v `addFiles` byly odstraněny všechny interní konstanty pro GIF/SVG (nyní pouze allow-list v `constants.ts`).
- **Reset inputu**: Všechna tři místa, kde se input maže (`edit-post-dialog.tsx`, `posts/new/page.tsx`, `posts/[id]/page.tsx`), již po `onChange` provádějí `e.currentTarget.value = ""` – to zůstává zachováno. Nová striktní kontrola navíc **zaručuje, že se nevalidní soubor nikdy nedostane do pipeline** – input tedy zůstane prázdný a uživatel může vybrat jiný soubor.
- **`src/components/edit-post-dialog.tsx`**:
  - `EditPostDialogProps.tLabels` rozšířen o `unsupportedFormat?: (values) => string`, `videoTooLarge?: string`, `videoLowResolution?: string`.
  - V `uploadLabels` jsou tyto tři klíče mapovány z `tLabels`; pokud je komponenta volána bez nich (zpětná kompatibilita), poskytne se anglický fallback.
- **`src/app/[locale]/(dashboard)/posts/new/page.tsx`** a **`src/app/[locale]/(dashboard)/posts/[id]/page.tsx`**:
  - `uploadLabels` objekt rozšířen o `unsupportedFormat` (jako arrow funkce delegující na `t("unsupportedFormat", { type })` – next-intl ICU safe), `videoTooLarge` a `videoLowResolution`.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány 3 nové klíče v sekcích `common` i `posts` (konzistentně v obou):
  - `unsupportedFormat` (placeholder `{type}`) – `"Formát {type} není podporován. Použijte JPG, PNG, WEBP nebo MP4/MOV."` / EN: `"Format {type} is not supported. Please use JPG, PNG, WEBP or MP4/MOV."` / UK: `"Формат {type} не підтримується. Використовуйте JPG, PNG, WEBP або MP4/MOV."`
  - `videoTooLarge` – nový limit 50 MB ve všech jazycích.
  - `videoLowResolution` – upozornění na nízké rozlišení.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové npm závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - GIF, SVG, AVI, MKV, WMV, BMP a další nepodporované formáty jsou nyní odmítnuty hned při výběru souboru – chyba se zobrazí dříve, než se vůbec začne něco nahrávat.
  - Videa > 50 MB jsou blokována; starý limit 20 MB pro videa byl příliš přísný a nedával smysl, když obrázky mají 50 MB hard cap.
  - Uživatel dostává **konkrétní informaci** o tom, který soubor a proč neprošel (`Formát image/gif není podporován…`).
  - U malých videí (<640 px) dostane měkké varování – upload proběhne, ale uživatel ví, že výsledek může být rozmazaný.
  - Cílená obrana v hloubce proti Meta subcode `2207082` a jemu podobným: do Supabase Storage a do API sociálních sítí se dostane jen to, co platforma skutečně akceptuje.

### Fix – Instagram MP4 publikování – sanitizace media URL (HOTFIX 2)

- **Problém**: Po opravě pollingu se polling dokončil správně (status_code: FINISHED byl dosažen), ale `media_publish` selhal s chybou `error_subcode: 2207082` – "Media upload has failed with error code 2207082". V logu `console.log` v Next.js dev serveru se URL zobrazovala obalená zpětnými uvozovkami `` `https://...mp4` ``, což naznačovalo, že string v DB obsahuje balicí uvozovky (jednoduché nebo zpětné). Meta API je striktní: `video_url` musí být čistá absolutní URL, jinak kontejner spadne s `2207082`.
- **Příčina**: V `getMediaUrls` hooku (`src/hooks/use-media-upload.ts`) se vracelo `i.url` bez jakékoliv sanitizace. Pokud se do `i.url` dostala URL s okolními uvozovkami/backticky (copy-paste, terminál/IDE formatter), zůstaly v ní a putovaly do DB i do Instagram API. Stejně tak `publishToInstagram` v `publish.ts` používalo `mediaUrls[0]` přímo – žádná sanitizace ani kontrola formátu.
- **Oprava**:
  - **`src/lib/utils.ts`** – přidán nový helper `sanitizeMediaUrl(input: unknown): string`:
    - Ověří, že `input` je `string`; jinak vrátí `""`.
    - Ořízne `trim()`.
    - Odstraní **jednu** pár okolních uvozovek (single `'`, double `"` nebo backtick `` ` ``).
    - Ověří, že výsledek odpovídá `/^https?:\/\/\S+$/i` – absolutní http/https URL; jinak vrátí `""`.
    - Úmyslně vrací `""` (ne `null`) – falsy → jednoduchý guard.
  - **`src/hooks/use-media-upload.ts`** – import `sanitizeMediaUrl` z `@/lib/utils`. `getMediaUrls()` nyní vrací `[sanitizeMediaUrl(i.url), ...]` filtrované na neprázdné stringy.
  - **`src/lib/actions/publish.ts`** – import `sanitizeMediaUrl`. V `publishToInstagram`:
    - Hned po `getFacebookMediaType` se `mediaUrls[0]` **nahradí sanitizovanou verzí** (`const mediaUrl = sanitizeMediaUrl(mediaUrls[0])`).
    - Pokud `sanitizeMediaUrl` vrátí prázdný string, vrátí se user-friendly chyba „Neplatná URL média (po sanitizaci). Zkuste soubor nahrát znovu." – dřív by se taková URL poslala rovnou do Meta API a tam spadla s kryptickou chybou.
    - Odstraněna duplicitní deklarace `const mediaUrl = mediaUrls[0]` (která sanitizovanou verzi přepisovala).
    - Diagnostický log `Vytvářím IG kontejner...` nyní obsahuje i `"mediaUrl (JSON)": JSON.stringify(mediaUrl)` – při debugu je jasně vidět, co se skutečně posílá (čistý JSON formát bez interpretace `util.inspect`).
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Instagram MP4 videa, jejichž URL omylem obsahovala okolní uvozovky/backticky, se nyní publikují správně.
  - Všechna URL posílaná do Meta API jsou nyní **vždy** čisté absolutní http(s) adresy – obrana v hloubce na obou vrstvách (klient i server).
  - User-friendly chybová hláška v případě, že se nepodaří URL ani po sanitizaci zvalidovat.

### Fix – Instagram MP4 publikování – polling status_code kontejneru (HOTFIX)

- **Problém**: Publikování MP4 videí na Instagram končilo chybou `(#9007) Media ID is not available` (`error_subcode: 2207027`). V lokalizované chybě: „Multimédium není připravené ke zveřejnění. Počkejte chvilku." Post se v `post_platforms` uložil jako `failed` a uložil se text chyby.
- **Příčina**: V `publishToInstagram` ([src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts)) se po vytvoření IG kontejneru čekalo pevných `setTimeout(10_000)` na zpracování videa. U reálných MP4 (řádově 10+ MB) Instagram nestihne za 10 s dokončit upload → transcode → scan, a proto `media_publish` skončil chybou `(#9007)` – media ještě nebylo připravené. Obrázky používaly 3s timeout a fungovaly OK.
- **Oprava** ([src/lib/actions/publish.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish.ts)):
  - Nový helper `getContainerStatusCode(payload)` – parsuje `status_code` z Graph API payloadu.
  - Nový typ `InstagramContainerStatus` (`IN_PROGRESS | FINISHED | PUBLISHED | ERROR | EXPIRED` + string fallback).
  - Nová async funkce `waitForInstagramContainerReady({ igUserId, creationId, accessToken, pollIntervalMs?, maxWaitMs? })`:
    - Každých **2.5 s** volá `GET https://graph.facebook.com/v20.0/{creation_id}?fields=status_code,status&access_token=…`.
    - Vrací `{ success: true }` jakmile `status_code === FINISHED` (nebo `PUBLISHED`).
    - Vrací `{ success: false, error }` při `ERROR` (s `status` textem z API) nebo `EXPIRED` (kontejner vypršel).
    - Hard timeout **120 s** (konfigurovatelný přes `maxWaitMs`).
    - Transientní network chyby se logují přes `console.warn` a polling pokračuje – nespadne na jednom výpadku sítě.
  - V `publishToInstagram`:
    - **Obrázky**: ponechán krátký 3s `setTimeout` (API je rychlé, polling by zbytečně zdržoval tok).
    - **Videa**: `setTimeout(10_000)` nahrazen voláním `waitForInstagramContainerReady` – čeká se skutečně na `status_code: FINISHED` z Instagramu.
  - Nové diagnostické `console.log` výpisy: `⏳ IG container status: { creationId, attempt, elapsedMs, status_code, status }` – umožní snadno sledovat průběh zpracování v konzoli prohlížeče.
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Žádné nové závislosti.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Instagram MP4 videa se nyní publikují spolehlivě, i když zpracování trvá 30-60 s (dříve failovalo konzistentně).
  - Chyba `(#9007) Media ID is not available` se již nebude zobrazovat u správně nahraných videí.
  - Pokud Instagram kontejner spadne (`status_code: ERROR`) nebo vyprší (`EXPIRED`), dostane uživatel srozumitelnou chybovou zprávu s textem z API, ne jen obecný timeout.

### Feature – Automatická komprese obrázků před uploadem (DOKONČENO)

- **Cíl**: Umožnit uživateli nahrát i velkou fotku (nad 5 MB) a nechat Postio, aby ji před odesláním do Supabase Storage automaticky zmenšilo. Dříve se soubory > 5 MB rovnou odmítaly (toast „fileTooLargeImage").
- **`src/lib/image-compression.ts`** (NOVÝ):
  - `compressImageIfNeeded(file, options?)` – čistá browser-side utilita, **bez nové npm závislosti** (nativní Canvas API).
  - Logika: pokud je soubor ≤ 5 MB nebo není obrázek (video/SVG/GIF) → vrátí originál. Pokud je > 5 MB a je to re-encodovatelný obrázek (JPEG/WebP/PNG), načte ho do `HTMLImageElement`, vypočítá nové rozměry (max 2048 px na delší straně, poměr zachován) a přes `canvas.toBlob` vygeneruje nový Blob.
  - **Iterativní kvalita**: 0.8 → 0.7 → 0.6 → 0.5, cíl ≤ 3 MB. Když se povede dosáhnout 3 MB, iterace se zastaví.
  - **Jediný toast**: `toast.warning("Soubor je příliš velký (nad 5 MB). Postio ho nyní automaticky optimalizuje pro sociální sítě…")` se zobrazí právě jednou při vstupu do komprese (ne při každém iteraci kvality).
  - **Log do konzole**: `📸 Optimalizace: Původní velikost X.XX MB -> Nová velikost Y.YY MB`.
  - **Bezpečné fallbacky**: pokud dekódování obrázku selže nebo `canvas.toBlob` vrátí `null`, vrátí se originální soubor + zobrazí se chybový toast (`compressionError`). SVG a GIF jsou úmyslně přeskočeny (vektor / animace).
  - Konstanta `COMPRESSION_THRESHOLD_BYTES = 5 * 1024 * 1024` exportovaná pro hook.
- **`src/hooks/use-media-upload.ts`**:
  - Přidán nový stav **`"optimizing"`** do `MediaUploadItem.status` (vedle `"uploading" | "ready" | "error"`).
  - Nahrazena stará logika `isFileTooLarge` novou **`isFileHardRejected`**: videa > 20 MB a obrázky > 50 MB se i nadále tvrdě odmítnou (hard cap), ale obrázky mezi 5 a 50 MB **už nejsou odmítnuty – putují do fáze optimalizace**.
  - V `addFiles`:
    1. Validace typu (beze změny).
    2. Hard-reject (videa > 20 MB / obrázky > 50 MB) – zobrazení `fileTooLargeImage` / `fileTooLargeVideo`.
    3. Pro obrázky > 5 MB se vytvoří položka se stavem `"optimizing"`, ostatní rovnou `"uploading"`.
    4. Asynchronní pipeline: `compressImageIfNeeded()` → (pokud `compressed`) update `file` + `previewUrl` (aby se v gridu hned zobrazil optimalizovaný obrázek) + `toast.success("Obrázek byl optimalizován")` → přepnutí stavu na `"uploading"` → `uploadFile()` → `"ready"`.
    5. Při chybě komprese se uploaduje originál + `toast.error("Nepodařilo se obrázek optimalizovat, odesílám originální soubor.")`.
  - `hasUploading()` nyní vrací `true` i pro stav `"optimizing"` → tlačítka "Uložit koncept / Naplánovat / Publikovat" zůstávají **disablovaná po celou dobu optimalizace i uploadu**.
  - Nové překlady v `MediaUploadLabels`: `optimizingImage`, `fileOptimized`, `compressionError`. Výchozí texty v angličtině jsou v `DEFAULT_LABELS` (kvůli `useTranslations` fallbacku).
- **UI indikace** – overlay přes náhled v gridu médií (tři místa, konzistentní styl):
  - `src/components/edit-post-dialog.tsx` (overlay s fialovým spinnerem – `text-purple-400`, text „Optimalizuji…").
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx` (stejný overlay, lokalizovaný text z `t("optimizingImage")`).
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` (stejný overlay – zajištěno, že i standalone editační stránka pokrývá nový stav).
- **Aktualizované `uploadLabels`** ve všech třech komponentách (EditPostDialog, posts/new, posts/[id]) – předávají hooku nové překlady.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – 3 nové klíče přidány v sekcích `common` i `posts` (konzistentně):
  - `optimizingImage` – lokalizovaná zpráva o auto-optimalizaci.
  - `fileOptimized` – úspěšná optimalizace.
  - `compressionError` – fallback na originál.
  - `fileTooLargeImage` přeformulováno z „max 5 MB" na „max 50 MB" (nyní hard cap, protože 5 MB se automaticky komprimuje).
- **Bezpečnost / Data**: Žádné DB změny. Žádné nové API routes. Komprese je čistě klientská (probíhá v prohlížeči před uploadem), server dostává už optimalizovaný soubor.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**: Uživatel může nahrávat fotografie z moderních telefonů (často > 10 MB) bez toho, aby dostal chybu. Postio samo optimalizuje velikost pro sociální sítě – upload je rychlejší, fotografie vypadají na sítích stále skvěle (max 2048 px, kvalita 0.8+). Tok funguje jak v `EditPostDialog`, tak na stránkách `posts/new` i `posts/[id]`.

### Feature – ETAPA 3: Finální doladění Facebook správy (DOKONČENO)

- **Cíl**: Vizuálně atraktivní a pohodlná správa více Facebook stránek – reálné avatary stránek, kategorie v kartě účtu a hromadná aktivace všech nalezených stránek jedním kliknutím.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - Typ `SocialAccount` rozšířen o `metadata?: { access_token?: string; category?: string | null }` – v `fetchAccounts()` se používá `select("*")`, takže `metadata` (JSONB sloupec z migrace 029) se vrací automaticky jako JS objekt.
  - **Importy**: přidán `Badge` z `@/components/ui/badge` a `Tag` ikona z `lucide-react`.
  - V kartě propojeného účtu přidán **Badge s kategorií stránky** pod název účtu – zobrazuje se **pouze pro `platform === "facebook"` a pokud `metadata.category` existuje** (jinak se nic neukazuje). Styl: `variant="premium"` (indigo průsvitný s border/backdrop-blur, konzistentní s Postio designem), `Tag` ikona vlevo, `text-[10px]` (decentní), `rounded-full`, `w-fit`.
  - **Avatary v kartě** se již zobrazovaly (`account.avatar_url`), kód zůstává – fallback na platformovou ikonu v plném kroužku (`rounded-full`) je zachován pro případ chybějícího avataru. Drobné sjednocení: `rounded-full` pro placeholder div, `object-cover` pro img.
  - Nové překlady `activateAll`, `activatingAll`, `allActivated`, `someFailed` propojeny do `<FacebookPageSelector>` přes `t={{...}}` – dynamické hodnoty (`{count}`, `{failed}`) se opět předávají přes funkce, aby nedošlo k `FORMATTING_ERROR` (next-intl + ICU).
- **`src/components/facebook-page-selector.tsx`**:
  - **Hromadná aktivace** (`handleActivateAll`): nové tlačítko "Aktivovat všechny nalezené stránky (N)" nad seznamem stránek, viditelné pouze pokud `items.length > 1`.
  - Tok: snapshot ids → optimicky vyprázdnit `items` a přidat všechna id do `pendingIds` → paralelně přes `Promise.allSettled` zavolat `toggleAccountActive(id, true)` pro každou stránku (paralelní běh, jeden failure neblokuje ostatní) → spinner na tlačítku i na jednotlivých řádcích (`isPending || bulkActivating`) → po dokončení toast (`allActivated(count)` při 100% úspěchu, jinak `someFailed(failed)`) + `onChanged()` pro refresh.
  - Per-row Switch je během `bulkActivating` zablokovaný (zobrazí se `Loader2`), aby nedošlo k duplicitním požadavkům.
  - Nové překlady v `t` prop: `activateAll(count)`, `activatingAll`, `allActivated(count)`, `someFailed(failed)` – všechny dynamické hodnoty jdou přes funkce (next-intl ICU safe).
- **Revalidace**: `toggleAccountActive` v `src/lib/actions/social-accounts.ts` již po každém úspěšném update volá `revalidatePath("/accounts")` – při hromadné aktivaci se tedy revalidace spustí N-krát (jednou za stránku), cache serveru je vždy čerstvá. Klientský refresh se pak děje přes `onChanged` callback v accounts page (ten volá `fetchAccounts()` + `fetchPendingPages()`), takže UI je aktualizováno okamžitě.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány 4 nové klíče v sekci `accounts`:
  - `activateAll` (placeholder `{count}`) – "Aktivovat všechny nalezené stránky ({count})".
  - `activatingAll` – "Aktivuji všechny stránky…".
  - `allActivated` (placeholder `{count}`) – "Všech {count} stránek bylo úspěšně aktivováno.".
  - `someFailed` (placeholder `{failed}`) – "Nepodařilo se aktivovat {failed} stránek. Zkuste to prosím znovu.".
- **Bezpečnost / Data**: Žádné DB změny. Žádná nová API route. Hromadná aktivace jde stále přes `toggleAccountActive` (server-side ownership check + RLS).
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.
- **Dopad**:
  - Uživatel v seznamu propojených účtů uvidí **reálnou fotku** své stránky (nebo FB fallback ikonu) a **kategorii** pod názvem.
  - Při mnoha FB stránkách je může připojit **jedním kliknutím** – žádné postupné přepínání switchů.

### Fix – FORMATTING_ERROR u dynamických zpráv FacebookPageSelectoru

- **Problém**: Konzole hlásila `FORMATTING_ERROR: The intl string context variable "name"/"category" was not provided to the string …` při práci s `FacebookPageSelector` (Accounts stránka).
- **Příčina**: V `accounts/page.tsx` se dynamické překlady (`pageCategoryLabel`, `pageConnected`, `pageDisconnected`) předávaly jako holý `t("…")` výsledek. Protože tyto řetězce obsahují ICU placeholdery (`{category}`, `{name}`), next-intl je při vykreslování/parsování validoval a hlásil chybějící proměnné. V komponentě se pak hodnoty dosazovaly ručně přes `String.replace(...)`, což už bylo příliš pozdě.
- **Oprava**:
  - **`src/components/facebook-page-selector.tsx`** – typ props u `categoryLabel`, `pageConnected` a `pageDisconnected` změněn ze `string` na `(value: string) => string`. Interní volání (`toast.success(…)` a vykreslení štítku kategorie) nyní funkci rovnou zavolají s dynamickou hodnotou.
  - **`src/app/[locale]/(dashboard)/accounts/page.tsx`** – tyto tři položky v `t={{…}}` se nyní předávají jako arrow funkce, které delegují na `t("…", { name })` / `t("…", { category })`. Díky tomu next-intl dostane hodnotu ještě před ICU formátováním a chyba zmizí.
- **Překlady**: Beze změn – stávající klíče v `cs.json` / `en.json` / `uk.json` (s placeholdery `{name}`, `{category}`) jsou nyní správně používány přes standardní next-intl API.
- **Build**: `npx tsc --noEmit` prošel ✅ 0 chyb.

### Fix – `null value in column "metadata"` při Facebook OAuth (HOTFIX)

- **Problém**: Při propojování Facebook účtu OAuth callback končil chybou `error code 23502: null value in column "metadata" of relation "social_accounts" violates not-null constraint`. Uživatel byl vrácen na úvodní stránku bez propojení.
- **Příčina**: V callbacku se u **Instagram řádků** (3 místa) posílal do `rowsToUpsert.push(...)` objekt bez `metadata`. Sloupec `metadata` je `NOT NULL DEFAULT '{}'::jsonb` (z migrace 029), ale při explicitním upsertu s `null` hodnotou se DEFAULT nepoužije – proto chyba.
- **Oprava** (`src/app/auth/callback/route.ts`):
  - Přidáno `metadata: {}` do všech 3 Instagram pushů:
    1. Instagram Direct Login (řádek ~248).
    2. Instagram z Pages v IG-only flow (řádek ~309).
    3. Instagram z Pages v běžném flow (řádek ~369).
  - Typ `rowsToUpsert` zpřísněn: `metadata: SocialAccountMetadata` (povinné, ne `optional`). Tím TypeScript zachytí podobnou chybu v budoucnu při kompilaci.
- **Bonus** (`src/components/facebook-page-selector.tsx`):
  - Přidán `<DialogDescription className="sr-only">` pro accessibility (řeší browser warning `Missing Description or aria-describedby`).
- **Build**: `npm run build` prošel ✅ 0 chyb.
- **Dopad**: Propojení Facebooku nyní projde čistě. IG i FB stránky se uloží do DB, dialog se otevře s pending pages.

### Feature – Výběr konkrétní Facebook Page (Krok 2: Frontend & Interakce) (DOKONČENO)

- **Cíl**: Po úspěšném přihlášení přes Facebook nabídnout uživateli UI pro zaškrtnutí stránek, které chce přes Postio publikovat. Backend logiku (uložení stránek jako `is_active=false` + endpoint `/api/accounts/facebook/select`) jsme připravili v předchozím kroku – tento commit ji zprístupňuje v UI.
- **`src/lib/actions/social-accounts.ts`** (NOVÝ) – serverová akce `toggleAccountActive(accountId, isActive)`:
  - Ověří přihlášení a provede **explicitní ownership check** (`select id where id=… and user_id=auth.uid()` – vrátí friendly chybu pokud account neexistuje nebo nepatří uživateli).
  - Aktualizuje `is_active` v `social_accounts` s `eq("id", accountId).eq("user_id", user.id)` (defence in depth – RLS navíc chrání).
  - Po úspěchu `revalidatePath("/accounts")` pro obnovení serverového listu.
  - Vrací `{ success, error? }` (žádné 500 výjimky – chyby se posílají jako result).
- **`src/components/facebook-page-selector.tsx`** (NOVÝ) – `"use client"` dialog (glassmorphism styl):
  - Vizuální styl konzistentní s `ConnectAccountModal`: `rounded-[24px]`, `bg-black/40 backdrop-blur-xl`, `border-white/10`, indigo→purple gradient akcenty, vlastní close tlačítko vpravo nahoře.
  - Hlavička s Facebook ikonou + titulkem + subtitulem.
  - Seznam stránek (každá = řádek s avatarem, názvem, kategorií a Switchem).
  - **Optimistická aktualizace**: po kliknutí se stránka **okamžitě odebere z lokálního seznamu** + zobrazí se `Loader2` spinner místo switche.
  - Po úspěchu `toast.success("Stránka {name} byla úspěšně připojena k Postiu.")` + `onChanged` callback.
  - Při chybě: revert + `toast.error`.
  - Prázdný stav: `CheckCircle2` + "Všechny vaše stránky jsou již aktivní."
  - Lokální stav `items` se re-syncuje s `pages` prop přes `useEffect` (pro případ opakovaného otevření dialogu).
  - Footer s tlačítkem "Hotovo" pro zavření.
  - **Bezpečnost**: žádný `access_token` se neodesílá na klienta – pouze `category` z `metadata`.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - Přidán state: `pendingPages`, `loadingPending`, `selectorOpen`.
  - Nová `fetchPendingPages()` – GET na `/api/accounts/facebook/select` (cache: no-store) → naplní `pendingPages`.
  - `useEffect` na mountu volá `fetchPendingPages()`.
  - **Auto-open dialogu**: pokud URL obsahuje `?fb=connected` a existují pending pages, dialog se **automaticky otevře**; po zavření se query param vyčistí přes `router.replace(pathname)`.
  - **Sekce "Nalezené stránky k připojení"** mezi kartou platforem a seznamem připojených účtů:
    - Glassmorphism karta s modro-indigo gradientem (odlišení od ostatních sekcí).
    - Ikona Facebook, badge s počtem, popis, tlačítko "Spravovat stránky" s `Sparkles` ikonou.
    - **Preview avatarů** prvních 4 stránek v `flex -space-x-2` + názvy prvních 3 + „a {count} dalších".
  - Po úspěšném přepnutí se volá `fetchAccounts()` (pro refresh aktivního seznamu) + `fetchPendingPages()` (stránka zmizí z pending).
- **`src/app/auth/callback/route.ts`**:
  - Po úspěšném Facebook Pages OAuth flow (ne Instagram) se k `finalNext` přidá `?fb=connected` (respektive `&fb=connected` pokud již parametry existují). Tím triggerujeme auto-open v `/accounts`.
  - Instagram direct login tento parametr **nedostává** (IG účty se aktivují automaticky).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidáno 17 nových klíčů v sekci `accounts`:
  - `pendingPagesTitle`, `pendingPagesSubtitle`, `managePagesButton`, `andMore` (s placeholder `{count}`).
  - `selectorTitle`, `selectorSubtitle`, `pageNoCategory`, `pageCategoryLabel` (s placeholder `{category}`).
  - `inactive`, `activating`, `deactivating`, `done`.
  - `pageConnected` (placeholder `{name}`), `pageDisconnected` (placeholder `{name}`), `errorToggle`, `selectorEmpty`.
- **Bezpečnost / Data**: Žádné DB změny (pouze UI). RLS chrání `toggleAccountActive`. Optimistická aktualizace má revert při chybě.
- **Build**: `npm run build` prošel ✅ 0 chyb. Endpoint `/api/accounts/facebook/select` (z Krok 1) je v route listu.

### Flow (konec→konec):
1. Uživatel klikne na Facebook v `/accounts` → OAuth na Meta.
2. Callback uloží všechny Pages jako `is_active=false` + metadata + redirect na `/accounts?fb=connected`.
3. `/accounts` detekuje `?fb=connected`, zavolá `fetchPendingPages()`, automaticky otevře `<FacebookPageSelector>`.
4. Uživatel zaškrtne stránky → `toggleAccountActive` → toast + refresh.
5. Stránky se okamžitě objeví v "Propojené účty" níže (a zmizí z pending).

### Feature – Výběr konkrétní Facebook Page (Krok 1: Backend logika) (DOKONČENO)

- **Cíl**: Připravit backend pro to, aby si uživatel po přihlášení přes Facebook mohl sám zvolit, **které** stránky (Pages) chce mít aktivní pro publikování. V tomto kroku jde výhradně o serverovou stranu – UI pro samotné zaškrtávání přijde v dalším kroku.
- **`supabase/migrations/029_add_metadata_to_social_accounts.sql`** (NOVÝ):
  - Přidán sloupec `metadata JSONB NOT NULL DEFAULT '{}'::jsonb` do `public.social_accounts`.
  - Držen generický JSON blob, aby se do něj v budoucnu mohly ukládat i per-platform extras (X bearer, TikTok open_id, …).
  - Existující unikátní index `social_accounts_user_platform_platform_id_key` na `(user_id, platform, platform_id)` zůstává beze změny → **jednoznačně podporuje více stránek pro jednoho uživatele** (jedna stránka = jeden řádek).
  - Migrace je `ADD COLUMN IF NOT EXISTS` → idempotentní a bezpečná pro opakované spuštění.
- **`src/app/auth/callback/route.ts`**:
  - Nový typ `SocialAccountMetadata` (exportuje vše potřebné pro UI): `access_token?`, `category?`.
  - Graph API dotaz `/me/accounts` nyní žádá i pole `category` (přidáno do `pagesFields`).
  - **Změna chování pro Facebook Pages**: každá stránka se nyní ukládá s `is_active = false` a metadata `{ access_token, category }` (page-level token a kategorie dle Meta). Hlavní sloupec `access_token` se plní stejnou hodnotou kvůli konzistenci s publishing logikou, ale v `metadata` je uložena totéž hodnota jako canonical per-page token.
  - **Bezpečnostní oprava**: těsně před upsertem se **deaktivují všechny existující Facebook řádky** daného uživatele (`update is_active=false where user_id=… and platform='facebook'`). Tím se zabrání tomu, aby stránka, kterou uživatel mezitím ztratil přístup v Meta, zůstala v Postiu aktivní. Instagram řádky zůstávají nedotčeny.
  - **Instagram chování beze změny**: jak direct login IG, tak IG z Pages se stále ukládají s `is_active = true` (single-IG-account model).
  - Pole `metadata?` přidáno do typu `rowsToUpsert`.
- **`src/app/api/accounts/facebook/select/route.ts`** (NOVÝ) – `GET` endpoint:
  - Vyžaduje přihlášení (`supabase.auth.getUser()`), RLS automaticky filtruje `user_id = auth.uid()`.
  - Vrací `JSON { pages: FacebookPageDto[] }`, kde každá page obsahuje: `id` (interní UUID – klíč pro pozdější aktivaci), `platform_id` (FB Page id), `account_name`, `avatar_url`, `category` (z `metadata.category`), `created_at`.
  - Filtruje `platform = 'facebook' AND is_active = false` – tedy **pouze neaktivní** stránky, které čekají na výběr.
  - Řazeno `created_at ASC` – nejstarší nahoře (typicky první přidaná Page).
  - **Bezpečnost**: žádné write operace, pouze read přes RLS-scoped Supabase client. `access_token` z `metadata` se nikdy neposílá na klienta (chráněn).
- **Bezpečnost / Data**:
  - RLS na `social_accounts` (z migrace 013) zůstává v platnosti – uživatel nikdy neuvidí cizí stránky.
  - Žádný `access_token` v hlavním API response – klient dostane jen `category` z `metadata`, což je bezpečné UI-hint pole.
- **Dopad na stávající flow**:
  - Po tomto commitu: po FB OAuth **žádná** Page není aktivní → uživatel musí stránky ručně zaškrtnout (připravíme v dalším kroku).
  - UI v `/accounts` by měl tento stav reflektovat – v dalším kroku přidáme hlášku „Nemáte aktivní žádnou FB stránku, vyberte si" + tlačítko pro otevření výběru z nového endpointu.
- **Build**: `npm run build` projde (viz další řádek). Endpoint se automaticky zaregistruje do Next.js route handlerů pod `/api/accounts/facebook/select`.

### Feature – Modální okno „O štítcích" po kliknutí na „Zjistit více" (DOKONČENO)

- **Cíl**: Po kliknutí na tlačítko „Zjistit více" v info banneru na stránce `/settings/labels` otevřít modální okno se stručným readmem pro uživatele – k čemu tagy jsou, jak je využít a hlavně proč.
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-dialog.tsx`** (NOVÝ) – `"use client"` komponenta:
  - Postavena na shadcn `Dialog` (stejný styl jako `CreateTagDialog` / `EditTagDialog`) s vlastním `DialogContent` (skryt výchozí close button – máme vlastní footer).
  - **Layout**: hlavička s indigo gradientem (konzistentní s bannerem), scrollovatelný body (`max-h-[60vh]`) se 4 sekcemi a patička s tlačítkem „Rozumím".
  - **Sekce** (každá s vlastní ikonou v kruhovém badge):
    1. **Co jsou štítky?** (`Tag` ikona) – vysvětlení, že jde o interní štítky, které si uživatel sám pojmenuje (kampaň, cílová skupina, fáze nákupní cesty, téma).
    2. **Proč je používat?** (`Sparkles` ikona) – 4 odrážky s indigo tečkami: rychlé filtrování, lepší přehled (počty), příprava na analytiku, konzistentní tým.
    3. **Jak je využít?** (`Filter` ikona) – číslovaný seznam 4 kroků: vytvořit v Nastavení → Štítky, přiřadit k příspěvku, filtrovat, sledovat počty.
    4. **Důležité – štítky jsou interní** (`EyeOff` ikona) – **amber** zvýrazněný box, zdůrazňuje, že sledující štítky nikdy neuvidí.
  - **Responzivita**: `sm:max-w-lg`; horizontální padding `px-6 sm:px-8`; body scrolluje vertikálně, pokud se na malé obrazovce nevejde.
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-banner.tsx`**:
  - Přidán nový prop `infoDialog: React.ComponentProps<typeof TagInfoDialog>["t"]` (překlady pro dialog).
  - `<a>` odkaz „Zjistit více" nahrazen `<button type="button">` se `setInfoOpen(true)` – nyní otevírá dialog místo pseudo-navigace.
  - Přidán interní state `infoOpen` (default `false`); dialog se renderuje vždy, ale zobrazí se jen po kliknutí.
  - Render banneru zabalen do fragmentu (`<>…</>`), aby vedle `<div>` bannneru mohl být i `<TagInfoDialog>` jako sourozenec.
  - Persistent dismiss v `localStorage` zůstává beze změny (banner lze i nadále zavřít křížkem; dialog je na tom nezávislý).
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Nový objekt `infoDialogTranslations` sestavuje všechny klíče pro dialog (včetně 4 + 4 položek seznamů).
  - Předán do `<TagInfoBanner t={bannerTranslations} infoDialog={infoDialogTranslations} />`.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidáno 18 nových klíčů v sekci `tags`: `infoDialogTitle`, `infoDialogIntro`, `infoDialogWhatTitle`, `infoDialogWhatBody`, `infoDialogWhyTitle`, `infoDialogWhyItem1`–`4`, `infoDialogHowTitle`, `infoDialogHowItem1`–`4`, `infoDialogVisibilityTitle`, `infoDialogVisibilityBody`, `infoDialogClose`.
- **Bezpečnost / Data**: Žádné DB změny, žádné server actions. Čistě UI vrstva (klientská komponenta + i18n klíče).
- **Build**: `npm run build` prošel ✅ 0 chyb. Stránka `/[locale]/settings/labels` se generuje správně.

### Feature – Info banner na stránce Štítky inspirovaný Bufferem (DOKONČENO)

- **Cíl**: Přenést na stránku `/settings/labels` (Nastavení → Štítky) kontextový info box o viditelnosti štítků pro organizaci, který zná uživatelé z Bufferu, a přizpůsobit jej Postio design systému (pure-black + glassmorphism + indigo akcent). Dbát na mobilní responzivitu.
- **Inspirace (Buffer)**: Banner s textem „Tags are visible to everyone in your organization. Learn more" + zvýrazněný odstavec v prázdném stavu „Create tags to organize and categorize your social media content…"
- **`src/app/[locale]/(dashboard)/settings/labels/tag-info-banner.tsx`** (NOVÝ) – `"use client"` komponenta:
  - Glassmorphism karta (`rounded-[20px]`, `border-white/5`, `bg-white/50 dark:bg-card/40`, `backdrop-blur-sm`) s ikonou `Info` v indigo „disku" (`bg-indigo-500/15 ring-1 ring-indigo-500/20`).
  - Inline text + odkaz „Zjistit více" v `text-indigo-300` s focus ringem pro klávesnici.
  - Tlačítko zavřít (`X`, lucide) s `aria-label` a větší touch target na mobilu (`h-8 w-8` absolutně vpravo nahoře → `sm:static sm:h-7 sm:w-7` na desktopu).
  - **Responzivita**: `flex-col` na mobilu (text pod ikonou, zavírací tlačítko absolutně v rohu), `sm:flex-row sm:items-center` na desktopu (vše v jedné řadě).
  - **Perzistentní dismiss**: stav uložen v `localStorage` pod klíčem `postio:labels:info-banner-dismissed` (props `storageKey` overridable). SSR-safe – server vždy renderuje banner; po `useEffect` mountu se teprve čte `localStorage` a případně banner skryje → žádný hydration mismatch.
  - Pokud `localStorage` není dostupný (private mode), selhání se tiše ignoruje a banner zůstane viditelný.
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Import + render `<TagInfoBanner t={bannerTranslations} />` vždy mezi hlavičkou a seznamem (viditelné jak v prázdném, tak v naplněném stavu – kontext pro uživatele je v obou případech cenný).
  - **Prázdný stav vylepšen**:
    - Původní `emptyTitle: "Štítky"` nahrazen novým klíčem `noTagsYet` (výstižnější pro prázdný stav).
    - Pod nadpisem a podtitulem přidán **zvýrazněný box** s textem `emptyDescription` – `rounded-[20px]` + `border-indigo-500/20` + `bg-indigo-500/5` + `backdrop-blur-sm` + text v `text-indigo-100/90`. Vizuální obdoba zvýrazněného textu v Bufferu, ale laděná do Postio designu (indigo akcent místo zelené).
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`:
  - `noTagsYet`: "Zatím žádné štítky" / "No tags yet" / "Ще немає міток".
  - `infoBannerText`: "Štítky jsou viditelné pro všechny ve vaší organizaci." / "Tags are visible to everyone in your organization." / "Мітки видимі для всіх у вашій організації."
  - `infoBannerLearnMore`: "Zjistit více" / "Learn more" / "Дізнатися більше".
  - `infoBannerDismiss`: "Zavřít" / "Dismiss" / "Закрити".
- **Poznámka**: Klíč `emptyTitle` v překladech zůstává (zpětná kompatibilita), ale aktuálně jej kód nepoužívá – bude-li v budoucnu nepotřebný, lze jej odstranit. `emptySubtitle` a `emptyDescription` se nadále používají v prázdném stavu.
- **Bezpečnost / Data**: Žádné DB změny, žádné server actions, žádné API volání. Čistě UI vrstva.
- **Build**: `npm run build` prošel ✅ 0 chyb. Všechny routy vygenerovány, včetně `/[locale]/settings/labels`.

### Feature – Počty příspěvků u každého tagu v Nastavení → Štítky (DOKONČENO)

- **Cíl**: Zobrazit u každého tagu v seznamu **počet příspěvků**, které mají tento tag přiřazen přes vazební tabulku `post_tags`. Bod 3 ze seznamu "Co zůstává na další iteraci".
- **`src/lib/actions/tag-actions.ts`**:
  - Nový typ `UserTagWithCount extends UserTag` s polem `post_count: number`.
  - Nová server action `getUserTagsWithCounts()` – vrací `UserTagWithCount[]`. Strategie: dva RLS-friendly dotazy (1. `tags` pro `user_id`, 2. `post_tags` aggregované na straně serveru v `Map<tag_id, count>`), výsledek sloučen v paměti. RLS na `post_tags` automaticky filtruje `auth.uid() = user_id`, takže cizí posty nejsou nikdy započítány. Tagy bez příspěvků mají `post_count: 0`.
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`**:
  - Server component přešel z přímého `supabase.from("tags").select("*")` na `getUserTagsWithCounts()`.
  - Výsledek předává do nové klientské komponenty `TagsList` (včetně `locale` pro pluralizaci).
  - Odstraněn nevyužitý import `Plus` z lucide-react.
- **`src/app/[locale]/(dashboard)/settings/labels/tags-list.tsx`** (NOVÝ) – `"use client"` wrapper nad `TagItem`:
  - Toggle "Seřadit podle názvu" / "Seřadit podle počtu" (výchozí = abecedně). Vizuál: glassmorphism přepínač v pravém horním rohu seznamu s aktivním stavem v `bg-indigo-500/15 text-indigo-300`. Ikony `ArrowDownAZ` / `Hash` (lucide).
  - Stabilní řazení: při shodě `post_count` se řadí abecedně (`localeCompare` s aktivním locale).
- **`src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx`**:
  - Přidány props `postCount: number` a `locale: string`.
  - Nový helper `formatPostsCount(count, locale, t)` – řeší české/ukrajinské skloňování (1, 2-4, 5+, 0) s oddělenými klíči `onePost` / `postsCountFew` / `postsCount` / `noPosts`. Anglie používá jednoduché `one` / `other`.
  - Vedle názvu tagu se zobrazuje **glassmorphism badge** s počtem:
    - `postCount > 0` → `bg-indigo-500/10 text-indigo-300` (aktivní).
    - `postCount === 0` → `bg-white/5 text-muted-foreground/60` s textem "Bez příspěvků".
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`: `noPosts`, `onePost`, `postsCount`, `postsCountFew`, `sortByName`, `sortByCount`. Příklady:
  - cs: `"Bez příspěvků"` / `"1 příspěvek"` / `"2 příspěvky"` / `"5 příspěvků"`.
  - en: `"No posts"` / `"1 post"` / `"5 posts"`.
  - uk: `"Без публікацій"` / `"1 публікація"` / `"3 публікації"` / `"10 публікацій"`.
- **Bezpečnost**:
  - RLS na `post_tags` (`auth.uid() = user_id`) zajišťuje, že počet nikdy nezahrnuje cizí příspěvky.
  - Žádné nové sloupce v DB nejsou potřeba.
- **Refresh**: Po `revalidatePath("/settings")` (z `createTag` / `deleteTag` / `updateTag` / `setPostTags`) se stránka `/settings/labels` automaticky přerenderuje a počty se aktualizují.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Feature – Editace tagu v Nastavení → Štítky (DOKONČENO)

- **Cíl**: Umožnit uživateli upravit název i barvu existujícího tagu. Bod 2 ze seznamu "Co zůstává na další iteraci".
- **`src/app/[locale]/(dashboard)/settings/labels/actions.ts`** – nová server action `updateTag(id, name, color)`:
  - Ověří přihlášení a **ownership** (`select id, name, color ... eq("id", id).eq("user_id", user.id).maybeSingle()` → pokud null, vrátí chybu).
  - Normalizuje `name = trim().replace(/^#/, "")`.
  - **Case-insensitive duplicity** přes `ilike(name, cleaned).neq("id", id).maybeSingle()` – pokud existuje jiný tag se stejným názvem, vrátí `{ success: false, alreadyExists: true }`.
  - `update` provede s `eq("id", id).eq("user_id", user.id)` (defence in depth) a aktualizuje `updated_at`. Po úspěchu `revalidatePath("/settings")` a vrátí aktualizovaný tag.
  - Typ `UpdateTagResult` exportován pro UI.
- **`src/app/[locale]/(dashboard)/settings/labels/edit-tag-dialog.tsx`** (NOVÝ) – klientský dialog (lucide Pencil) s:
  - Inputem pro název (placeholder: `Název štítku` / `Tag name` / `Назва мітки`).
  - 10 předdefinovanými barvami (stejná sada jako `CreateTagDialog` a `TagPicker`).
  - Tlačítky `Uložit` / `Zružit`.
  - Toast oznámení: `tagUpdated` (úspěch), `tagNameExists` (duplicita), jinak `error.message`.
  - Re-sync lokálního stavu s `initialName`/`initialColor` při každém otevření (takže editace dvou různých tagů po sobě funguje korektně).
- **`src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx`** – přidáno tlačítko **Upravit** (Pencil ikona) před tlačítkem Smazat, zobrazené na `group-hover` (konzistentní s existujícím UX mazání).
- **`src/app/[locale]/(dashboard)/settings/labels/page.tsx`** – rozšířen `itemTranslations` o nové i18n klíče.
- **Překlady** (`cs.json`, `en.json`, `uk.json`) – přidány klíče v sekci `tags`: `save`, `editTag`, `tagUpdated`, `tagNameExists`.
- **Bezpečnost**:
  - Ownership check je **povinný** – cizí tag nelze editovat (test: pokus o `updateTag` s cizím `id` vrátí `success: false, error: "Tag not found"`).
  - `ilike` pro case-insensitive porovnání (zamezí obcházení velikostí písmen).
  - WHERE klauzule `eq("user_id", user.id)` je v update dotazu (defence in depth vedle explicitního `ownedTag` checku).
  - RLS na `tags` je již aktivní – žádné změny v DB nejsou potřeba.
- **Refresh** – po úspěšném uložení `revalidatePath("/settings")` v server action → server render stránky `/settings/labels` se obnoví; navíc se změna barvy okamžitě projeví v kartě příspěvku (`_post-card.tsx`), tag filtru (`_posts-filters.tsx` → `TagFilterSelect`) a v `TagPickeru`, protože tyto komponenty čtou `tag.color` z `tags` tabulky – po refreshi se změna automaticky projeví.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Fix – Chybějící překlady pro tag filtr v Příspěvcích (DOKONČENO)

- **Problém**: Na stránce `/posts` (src\app\[locale]\(dashboard)\posts\page.tsx) se v konzoli zobrazovaly chyby `MISSING_MESSAGE` pro klíče `posts.filterByTag`, `posts.allTags` a `posts.noTagsAvailable`.
- **Příčina**: Při dřívější implementaci tag filtru v Příspěvcích/Kalendáři byly tyto tři klíče přidány pouze do sekce `calendar` v `cs.json`/`en.json`/`uk.json`. Sekce `posts` je ale používá samostatně (přes `t("filterByTag")` atd.) – klíče v ní chyběly.
- **Řešení**: Přidány chybějící klíče do sekce `posts` ve všech třech jazykových souborech (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `filterByTag`: "Filtr podle štítku" / "Filter by tag" / "Фільтр за тегом"
  - `allTags`: "Všechny štítky" / "All tags" / "Усі теги"
  - `noTagsAvailable`: "Zatím nemáte žádné štítky. Vytvořte je v Nastavení → Štítky." / "You have no tags yet. Create them in Settings → Labels." / "У вас ще немає тегів. Створіть їх у Налаштуваннях → Мітки."
- **Dopad**: Stránka `/posts` se nyní vykresluje bez `MISSING_MESSAGE` chyb. Tag filtr na Příspěvcích i Kalendáři používá stejné texty.

### Feature – Filtr podle interních štítků v Příspěvky/Kalendáři (DOKONČENO)

- **Cíl**: Umožnit filtrování příspěvků podle interních štítků (Nastavení → Štítky) v seznamu Příspěvky i v Kalendáři – bod 1 ze seznamu "Co zůstává na další iteraci".
- **`src/components/post-filters-row.tsx`**:
  - Přidána nová interní komponenta `TagFilterSelect` – specializovaný dropdown s barevnou tečkou u každé možnosti (vizuální vazba na barvu tagu z DB). Reaguje na aktivní tag – v triggeru zobrazí tečku barvy místo výchozí ikony. Plná podpora mobile/desktop + empty state ("Zatím nemáte žádné štítky").
  - Rozšířen `PostFiltersRow` o nové volitelné props: `tagValue`, `tagOptions`, `tagLabel`, `allTagsLabel`, `noTagsLabel`, `onTagChange`. Pokud `onTagChange` není předán, třetí filtr se vůbec nevykreslí (zpětná kompatibilita).
  - Vstupní tvar `tagOptions` odpovídá `UserTag` z `tag-actions.ts` (`{ id, name, color }`). V renderu se mapuje na interní `{ value: id, label: name, color }`.
  - Layout na desktopu: tři filtry vedle sebe, `sm:max-w-[660px]`. Na mobilech tři filtry pod sebou (vertikální flex).
- **`src/app/[locale]/(dashboard)/posts/_posts-container.tsx`**:
  - Přidán state `activeTag` a rozšířen `filteredPosts` o tag filtr: `(post.post_tags ?? []).some(t => t.id === activeTag)`.
  - Předány nové props `tags`, `tFilterByTag`, `tAllTags`, `tNoTagsAvailable` do renderu `PostFiltersRow`.
- **`src/app/[locale]/(dashboard)/posts/page.tsx`**:
  - Import `getUserTags` z `@/lib/actions/tag-actions`.
  - Zavoláno `getUserTags()` paralelně s ostatními načítáními a výsledek předán do `PostsContainer` (fallback na `[]` při chybě).
- **`src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx`**:
  - Přidán state `tagFilter`, předán do `PostFiltersRow` (`tagValue`, `tagOptions`, `onTagChange`).
  - Předán dále do `CalendarView` jako nový prop `tagFilter`.
  - Rozšířen `tCalendar` typ o volitelná pole `filterByTag`, `allTags`, `noTagsAvailable`.
- **`src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`**:
  - Přidán nový prop `tagFilter?: string` do `CalendarViewProps`.
  - Rozšířen `effectiveFilteredPosts` o tag filtr (stejná logika jako v `PostsContainer`).
- **`src/app/[locale]/(dashboard)/calendar/page.tsx`**:
  - Import `getUserTags`. Zavoláno `await getUserTags()` a výsledek předán do `CalendarClient` jako `tags` prop.
- **Překlady** (`cs.json`, `en.json`, `uk.json`):
  - Sekce `posts` i `calendar` rozšířeny o klíče: `filterByTag`, `allTags`, `noTagsAvailable`.
- **UX detaily**:
  - Filtr je plně nezávislý na stávajících filtrech (platforma, stav) – všechny se kombinují AND logikou.
  - V triggeru se po výběru tagu zobrazí barevná tečka (10px kroužek s `ring-1`) + jeho název. V dropdownu je tečka u každé option.
  - Prázdný stav: pokud uživatel nemá žádné tagy, dropdown zobrazí informaci "Zatím nemáte žádné štítky" jak v desktopu tak v mobile bottom-sheetu.
  - Tlačítko pro vymazání filtru (X) je vždy k dispozici, když je filtr aktivní.
- **Build**: `npm run build` prošel ✅ 0 chyb. Všechna nová pole v `tLabels`/`tCalendar` jsou volitelná s `??` fallbacky – zpětná kompatibilita zachována.

### Fix – Interní štítky se v kartě nezobrazovaly po uložení (DOKONČENO)

- **Problém**: Po kliknutí na "Uložit interní metadata" v `EditPostDialog` se toast zobrazil a backend vrátil 200 OK, ale interní štítky se v kartě příspěvku na stránce Příspěvky (`/posts`) nezobrazovaly.
- **Příčina** (dvě chyby):
  1. **Chybějící JOIN v SELECTu** – server component `posts/page.tsx` načítal `posts` přes `select("*, post_platforms(*)")` – **chybělo `post_tags(tags(id, name, color))`**. Server tedy vůbec nevěděl, že příspěvek má interní tagy. V kalendáři to bylo opraveno (viz. předchozí CHANGELOG), ale v `posts/page.tsx` se na to zapomnělo.
  2. **State se neaktualizoval po `router.refresh()`** – `PostsContainer` držel seznam příspěvků ve vlastním `useState(initialPosts)`, který se inicializoval jen jednou. Když `EditPostDialog` po uložení zavolal `router.refresh()`, server sice poslal nová data, ale lokální `posts` state zůstal starý.
- **Řešení**:
  - **`posts/page.tsx`**:
    - Přidán `post_tags(tags(id, name, color))` do SELECTu.
    - V `map()` funkci přidána normalizace `post_tags` z formátu `[{ tags: { id, name, color } | null }]` na flat array `[{ id, name, color }]`.
    - V `initialPosts` mappingu přidáno `post_tags: post.post_tags ?? []`.
  - **`_posts-container.tsx`**: Přidán `useEffect`, který synchronizuje lokální `posts` state s `initialPosts` props při každé změně. Po `router.refresh()` se nyní karty v seznamu automaticky aktualizují.
- **Dopad**: Štítky uložené přes tlačítko "Uložit interní metadata" (nebo přes standardní uložení příspěvku) se nyní **okamžitě zobrazí v kartě** v seznamu Příspěvky i v Kalendáři.
- **Build**: `npm run build` prošel ✅ 0 chyb.

### Fix – Tlačítko pro uložení interních štítků u publikovaných příspěvků (DOKONČENO)

- **Problém**: Uživatel hlásil, že po výběru interního štítku (Nastavení → Štítky) v editoru se u publikovaných příspěvků neobjevilo žádné tlačítko pro uložení změn. Stejný problém se projevil u nových příspěvků. Interní metadata tak nebylo možné uložit.
- **Příčina**:
  1. `EditPostDialog` – v `isAnyPublished` větvi se tlačítka zobrazovala jen podmíněně (`isContentChanged`, `canPublishAdditional`). Pokud uživatel změnil pouze interní metadata (tagy/lokaci), nezobrazilo se žádné tlačítko.
  2. `posts/[id]/page.tsx` – v `handleSave`, když byl `status === "published"`, se vždycky volalo `publishPost` (znovu publikovalo na sociální sítě), i když se změnily jen interní tagy.
  3. `posts/new/page.tsx` – tlačítka byla disabled, ale bez vysvětlení proč (uživatel nevěděl, že chybí text/platformy).
- **Řešení**:
  - **`edit-post-dialog.tsx`**: Přidán `useMemo` `hasMetadataChanges` (porovnává `selectedTagIds`, `location`, `tags` proti originálu). Přidán handler `handleSaveMetadata` volající `updatePost` jen s interními poli (location, tags, tagIds). V `isAnyPublished` větvi přidáno tlačítko "Uložit interní metadata" (vždy viditelné, disabled pokud žádná změna). Rozšířen typ `tLabels` o volitelná pole `saveMetadata`, `metadataSaved`.
  - **`posts/[id]/page.tsx`**: Přidán state `originalPost` (snapshot originálních dat). Přidány `useMemo` `isContentChanged` a `hasMetadataChanges`. Přidán handler `handleSaveMetadata`. V `handleSave` u `status === "published"` se nově větví: pokud `!isContentChanged` → uloží se jen metadata, BEZ opakovaného `publishPost`. V UI přidáno druhé tlačítko "Uložit interní metadata" vedle "Uložit".
  - **`posts/new/page.tsx`**: Přidána nápověda `newPostHint` pod tlačítka, která se zobrazí, když chybí text nebo platformy – uživatel pochopí, proč jsou tlačítka disabled.
  - **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`): Přidány klíče `saveMetadata`, `metadataSaved`, `saveMetadataTooltip`, `metadataOnlyHint`, `newPostHint` v sekcích `posts` i `calendar`.
- **Bezpečnost**: `updatePost` striktně odděluje interní metadata od `published_platforms`/`published_at`/`external_ids` – tyto sloupce se nikdy nepřepíšou přes `updatePost` (řízeno přes RPC `append_published_platform` v `publish` flow). Nové tlačítko "Uložit interní metadata" je tedy zcela bezpečné – nikdy neovlivní stav na sociálních sítích.
- **Build**: `npm run build` prošel ✅ 0 chyb. Typ `tLabels` rozšířen zpětně kompatibilně (všechna nová pole jsou volitelná s `??` fallbacky).

### Feature – Interní štítky (Nastavení → Štítky) integrace do editoru a karty (DOKONČENO)

- **Cíl**: Štítky z tabulky `tags` (dříve "dead feature") dostaly skutečný účel – slouží jako interní organizační pomůcka. Inline hashtagy (`posts.tags: string[]`) zůstávají beze změn pro publikaci na sociální sítě.
- **`supabase/migrations/028_create_post_tags.sql`** (NOVÝ) – vazební tabulka `post_tags` (N:M mezi `posts` a `tags`). Sloupce: `id`, `post_id`, `tag_id`, `user_id`, `created_at`, `updated_at` + UNIQUE(post_id, tag_id) + indexy + RLS politiky (SELECT/INSERT/DELETE přes `auth.uid() = user_id`) + trigger na `updated_at`. CASCADE na smazání.
- **`src/lib/supabase/types.ts`** – přidány typy `tags` a `post_tags` (Row/Insert/Update).
- **`src/lib/actions/tag-actions.ts`** (NOVÝ):
  - `getUserTags()` – načte všechny tagy přihlášeného uživatele (seřazené abecedně).
  - `createTagInline(name, color)` – vytvoří nový tag z editoru. Při duplicitě (case-insensitive) vrátí existující tag s `alreadyExists: true`.
  - `setPostTags(postId, tagIds)` – diff-based: smaže všechny vazby pro post, vloží nové (s ownership checkem na `tags` i `posts`).
  - `getPostTags(postId)` – vrátí tagy s metadaty (name, color) přiřazené k postu.
- **`src/lib/actions/posts.ts`** – rozšíření:
  - `getPosts` / `getPost` – JOIN na `post_tags(tags(id, name, color))`. Výsledek normalizován do flat array `post_tags: { id, name, color }[]`.
  - `createPostAction` / `updatePost` – nový volitelný parametr `tagIds: string[]`. Po dual-write bloku se zavolá `setPostTags()`.
- **`src/components/tag-picker.tsx`** (NOVÝ) – multi-select picker komponenta (glassmorphism, `rounded-[20px]`). Podporuje:
  - Inline vytváření nových štítků s výběrem barvy (10 předdefinovaných barev).
  - Search + outside-click close.
  - Zobrazení vybraných tagů jako barevné chipy s tlačítkem pro odebrání.
- **Editor integrace** – `posts/new/page.tsx`, `posts/[id]/page.tsx`, `edit-post-dialog.tsx`, `calendar/_calendar-view.tsx`: TagPicker přidán pod existující inline hashtag input (beze změn). Hydratace `selectedTagIds` z `post_tags` při načtení existujícího příspěvku. Všechna volání `createPostAction`/`updatePost` rozšířena o `tagIds`.
- **Karta příspěvku** – `_post-card.tsx`: typ `PostListItem` rozšířen o `post_tags?: { id, name, color }[]`. V kartě se pod textem zobrazují barevné `Badge` s tečkou barvy štítku. `_posts-container.tsx` a `calendar/_calendar-client.tsx` synchronizovány.
- **Překlady** – `cs.json`, `en.json`, `uk.json`: přidány klíče `internalTags`, `internalTagsPlaceholder`, `createTag`, `noInternalTags`, `selectColor`, `add`, `cancel` v sekcích `posts` i `calendar`. Předávány do `posts/page.tsx` a `calendar/page.tsx`.
- **`calendar/page.tsx`** – SELECT rozšířen o `post_tags(tags(id, name, color))`, normalizace v map() funkci.
- **Build** – `npm run build` prošel ✅. Opraveny drobné TS chyby (duplicitní `cancel` v `edit-post-dialog.tsx`, chybějící importy, optional → required `tLabels` klíče).
- **Publish flow** – beze změn. `publish.ts` nikdy nepoužíval `post.tags`, nyní ani nové `post_tags` se neodesílají. Štítky jsou čistě interní.
- **Dopad na stávající data** – žádná. `post_tags` je prázdná. Inline hashtagy fungují dál. Nastavitelné štítky v Nastavení → Štítky konečně použitelné.
- **Co zůstává na další iteraci** (nyní mimo scope): breakdown v Analytice.

## 2026-06-14

### Feature – LinkedIn OAuth Integration (DOKONČENO)

- **Cíl**: Umožnit uživatelům propojit LinkedIn účet přes OAuth 2.0. Zatím jen připojení, publikování následuje.
- **`.env.local`** – přidány `LINKEDIN_CLIENT_ID` a `LINKEDIN_CLIENT_SECRET` (prázdné, čekají na vyplnění z LinkedIn Developer Portal).
- **`supabase/migrations/027_add_token_expires_at_to_social_accounts.sql`** – nový sloupec `token_expires_at TIMESTAMPTZ` v `social_accounts`. LinkedIn tokeny expirují za 60 dní.
- **`src/lib/supabase/types.ts`** – typy `social_accounts` rozšířeny o `token_expires_at: string | null` (Row, Insert, Update).
- **`src/app/api/accounts/linkedin/route.ts`** – nový API route (GET):
  - Bez `code` parametru → redirect na LinkedIn OAuth consent (`w_member_social openid profile email`).
  - S `code` → exchange pro access_token → fetch `/v2/userinfo` → uložení do `social_accounts` (platform='linkedin', token_expires_at=60 dní).
  - Používá `createAdminClient` pro upsert s `onConflict: user_id,platform,platform_id`.
  - Redirect zpět na dashboard (`/accounts`) po úspěchu/chybě.
- **`src/app/[locale]/(dashboard)/accounts/page.tsx`**:
  - `linkedin` přidán do podmínky, která otevírá `ConnectAccountModal` místo manuálního formuláře.
  - `onConnect` handler redirect na `/api/accounts/linkedin?state=...&locale=...`.
  - `SocialAccount` typ rozšířen o `token_expires_at`.
- **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `connectModal.warningDescLinkedIn` – upozornění na 60d expiraci tokenů.
- Build: `npm run build` ✅ 0 chyb

### Feature – AI Vision: Generování popisku z obrázku přes Gemini (DOKONČENO)

- **Cíl**: Rozšíření AI asistenta o multimodální analýzu obrázků – AI analyzuje první nahraný obrázek u příspěvku a vytvoří poutavý popisek.
- **`src/app/api/ai/generate/route.ts`** – nová akce `generate_from_image`:
  - Backend fetchne obrázek z `imageUrl` (Supabase Storage public URL) a pošle ho Gemini jako base64 inline data přes multimodální API.
  - Pokud je v editoru už nějaký text, AI ho vezme v úvahu a propojí s obsahem fotky.
  - Prompt (čeština): "Analizuj tento obrázek a vytvoř poutavý popisek (caption) pro sociální sítě. Buď kreativní, angažující a přirozený."
  - Demo fallback: pokud API klíč chybí, vrátí demo text.
  - Stávající akce (`improve`, `shorten`, `hashtags`) zůstávají beze změny.
- **`src/components/ai-assistant-button.tsx`** – rozšíření komponenty:
  - Nový volitelný prop `imageUrl?: string | null`.
  - Nová položka v dropdown menu: "Generovat z obrázku ✨" s ikonou `ImagePlus` (amber barva).
  - Položka je `disabled` (opacity 40%, cursor not-allowed) pokud `imageUrl` není k dispozici.
  - Samostatný handler `handleGenerateFromImage` – posílá `imageUrl` + volitelný `text` z editoru.
  - Stávající funkce (`handleTextAction` pro improve/shorten/hashtags) plně funkční, žádná regrese.
- **`src/app/[locale]/(dashboard)/posts/new/page.tsx`** – `firstImageUrl` derived z `mediaItems` (první image se `status === 'ready'`) předává jako `imageUrl`.
- **`src/components/edit-post-dialog.tsx`** – stejně `firstImageUrl` z `mediaItems`. Opraven typový warning (`SUPPORTED_UPDATE_PLATFORMS as unknown as string[]`).
- **`src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`** – inline formulář nemá media upload, takže tlačítko zůstane disabled (správné chování). Typ `tAi` rozšířen.
- **Překlady** (`src/messages/cs.json`, `en.json`, `uk.json`):
  - `generateFromImage`: "Generovat z obrázku ✨" / "Generate from image ✨" / "Згенерувати з фото ✨"
  - `aiNoImage`: "Nejprve nahrajte obrázek." / "Upload an image first." / "Спочатку завантажте зображення."
- **Typy**: Rozšířeny v `AiTranslations`, `AIAssistantButtonProps`, `EditPostDialogProps`, `CalendarView`, `CalendarClient`, `PostsContainer`, `PostCard` – všude konzistentně.
- Build: `npm run build` ✅ 0 chyb

### Fix – Oprava Facebook update "Application does not have the capability" (#3)

- **Problém**: `updateOnPlatformAction` pro Facebook selhával s chybou `(#3) Application does not have the capability`. Dva důvody:
  1. Dotaz na `social_accounts` selectoval sloupec `metadata`, který v DB neexistuje – dotaz padl s `42703` a vrátil `null`, což vedlo k hlášce "Chybí přístupový token".
  2. Pokud `external_id` nebyl ve formátu `page_id_post_id` (bez podtržítka), Meta API neznalo příspěvek bez kontextu stránky.
- **Řešení** (`src/lib/actions/publish.ts`):
  - Odstraněn `metadata` ze SELECT dotazu (sloupec neexistuje). Token z `social_accounts.access_token` je už Page Access Token (uložený z `/me/accounts` při OAuth callbacku).
  - Pokud `external_id` neobsahuje podtržítko, sestavíme ho dynamicky jako `${platform_id}_${external_id}`.
  - Přidáno detailní logování `[FB UPDATE]` a `[TOKEN LOOKUP]` pro debug.
- Změněné soubory:
  - `src/lib/actions/publish.ts`

## 2026-06-13

### Feature – Univerzální per-platform update publikovaných příspěvků

- **Cíl**: Přípráva kódu pro dodatečnou úpravu textu u již publikovaných příspěvků, rozšiřitelná pro všechny podporované platformy.
- **`src/lib/actions/publish.ts`** – nová funkce `updateOnPlatformAction(postId, platform, newContent)`:
  - Striktní ověření `user_id` (bezpečnost) – post musí patřit přihlášenému uživateli.
  - Načte `external_id` z `post_platforms` a `access_token` z `social_accounts` pro danou platformu.
  - Switch/case router podle platformy:
    - `facebook`: Plně funkční – POST `graph.facebook.com/{external_id}?message={newContent}`
    - `linkedin`: Placeholder s TODO komentářem (PUT `/v2/posts/{id}`)
    - `youtube`: Placeholder s TODO komentářem (`videos().update`)
    - `twitter` / `x`: Placeholder s TODO komentářem (PUT `/2/tweets/{id}`)
    - `instagram`: Explicitní chyba (API úpravy nepodporuje)
  - Po úspěchu aktualizuje `updated_at` v `post_platforms` a `content` v `posts`.
- **`src/components/edit-post-dialog.tsx`** – dynamické UI:
  - `SUPPORTED_UPDATE_PLATFORMS = ["facebook", "linkedin", "youtube"]` – konfigurační objekt pro snadné rozšiřování.
  - `isContentChanged` detekce: `content.trim() !== post.content?.trim()`.
  - Dynamická tlačítka "Aktualizovat na [Platforma]" – generována pro každou platformu v `post_platforms`, která má `status='published'` A je v seznamu `SUPPORTED_UPDATE_PLATFORMS`.
  - Per-platform loading stavy (`updatingPlatforms` record) – každé tlačítko má vlastní loading spinner.
  - Toast po úspěchu: "Text na [Platforma] byl úspěšně upraven".
  - Instagram varování (žlutý banner) zůstává – zobrazuje se když je post publikován na Instagramu.
- **Design switch/case struktury**:
  - Každá platforma má vlastní `case` blok s API voláním.
  - Společná logika (ověření uživatele, načtení tokenů, update DB, revalidace) je OUTSIDE switch – každá nová platforma potřebuje jen napsat svůj API call.
  - Přidání nové sítě = 1 nový case blok + přidání do `SUPPORTED_UPDATE_PLATFORMS` v UI.

### Fix – Publikování na další platformu (Facebook) po publikování na Instagram

- **Problém**: Když uživatel publikoval příspěvek na Instagram (status `published`, zelená fajfka) a poté chtěl publikovat stejný příspěvek také na Facebook, příspěvek se fyzicky publikoval na Facebook profil, ale aplikace si to nepamatovala. Ikona Facebook zůstala bez fajfky jak na kartě příspěvku tak v dialogu úprav.
- **Příčina**: `publishAdditionalPlatforms` v `publish.ts` volal `handlePublishSuccess`, který dělal `UPDATE` na `post_platforms` kde `platform = 'facebook'`. Ale pokud Facebook v `post_platforms` vůbec neexistoval (příspěvek původně měl jen Instagram), UPDATE aktualizoval 0 řádků. DB zůstala nezměněná.
- **Řešení**: Před publikováním zkontrolujeme, zda cílová platforma existuje v `post_platforms`. Pokud ne, nejprve vytvoříme řádek se statusem `draft`. Poté `handlePublishSuccess` aktualizuje tento řádek na `published` s `external_id` a `published_at`.
- **Změněné soubory**:
  - `src/lib/actions/publish.ts` – přidána kontrola a insert do `post_platforms` v `publishAdditionalPlatforms`

### Fix – `removed_externally` se nastavuje až po skutečném smazání z platformy

- **Problém**: Když uživatel klikl na "Smazat" pro Instagram příspěvek, `deleteFromMeta` vrátil chybu (Instagram nepodporuje DELETE přes API) a okamžitě se status změnil na `removed_externally` v DB. Po obnovení stránky se příspěvek zobrazil jako "Odstraněn externě" i když byl stále na Instagramu.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`): Při chybě mazání (API not supported, network error, missing externalId) se již NENASTAVUJE `removed_externally`. Jediná výjimka je "Object not found" – když Meta potvrdí že příspěvek skutečně neexistuje.
  - `removed_externally` se nastavuje POUZE přes `syncPostStatus` / `syncPublishedPosts` které ověří přes GET request že příspěvek na platformě skutečně chybí.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: Info toast nyní informuje uživatele že musí smazat ručně na platformě a Postio to detekuje při sync – bez změny stavu v DB.
- **Nový workflow**:
  1. Uživatel klikne "Smazat" → Postio zkusí DELETE → API vrátí chybu
  2. Toast: "Instagram nepodporuje smazání přes API. Smažte příspěvek ručně."
  3. Status v DB zůstává `published` – příspěvek se nezobrazuje jako "Odstraněn externě"
  4. Uživatel smaže příspěvek ručně na Instagramu
  5. `syncPublishedPosts` (každé 30 min) ověří přes GET že příspěvek chybí → až tehdy `removed_externally`

### Feature – Chytré mazání Instagram příspěvků (Smart Delete)

- **Problém**: Když uživatel smazal publikovaný příspěvek z Instagramu přes aplikaci Postio, Meta API vrátilo chybu ("Unsupported delete request") a příspěvek zůstal v DB jako `published` navždy. Uživatel neměl možnost příspěvek z aplikace odstranit a neviděl, že na Instagramu stále existuje.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`):
    - Přidán nový return flag `cannotDeleteViaApi` do return typu.
    - Když Meta API vrátí chybu (kromě "Object not found"), příspěvek se nyní označí jako `removed_externally` v `post_platforms` místo aby se vrátila jen chyba.
    - "Object not found" (příspěvek už smazán externě) nyní také explicitně nastaví `removed_externally` + `cannotDeleteViaApi: true`.
    - Network errors a chybějící `externalId` také vedou k `removed_externally` + `cannotDeleteViaApi`.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`:
    - `handleDeleteConfirm`: Nová logika — místo blocking warning toastu pro Instagram, se zobrazí informativní `toast.info` s vysvětlením že příspěvek byl označen jako "Odstraněn externě" a lze jej kdykoli bezpečně smazat z aplikace.
    - Přidáno tlačítko "Chytré mazání" (červený koš) vedle tlačítka Republish pro příspěvky se statusem `removed_externally`.
    - Banner "Odstraněn externě" nyní obsahuje text o možnosti bezpečného smazání z aplikace.
    - Ikony platforem s `removed_externally` stavem mají oranžový badge (AlertTriangle) pro vizuální indikaci.
  - `syncPublishedPosts` v `posts.ts` již umí automaticky detekovat příspěvky smazané na Instagramu ručně (každé 30 min kontroluje Meta API GET).

- **Nový workflow pro Instagram mazání**:
  1. Uživatel klikne "Smazat" → Postio zkusí smazat přes API → API vrátí chybu
  2. Příspěvek se označí jako `removed_externally` (oranžový badge + varovný banner)
  3. Uživatel vidí že příspěvek je "Odstraněn externě" a může:
     - Smažit ho ručně na Instagramu → Postio to detekuje při sync (každé 30 min)
     - Použít "Chytré mazání" (🗑) pro okamžité odstranění z aplikace
     - Použít "Republish" pro znovupublikování

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

## 2026-06-12

### Fix – Oprava zobrazení ikon po publikování na Instagram
- **Problém**: V seznamu příspěvků (stránka Příspěvky) a v kalendáři se nezobrazovaly správně ikonky platforem (zejména po úspěšném publikování). Pole `post_platforms` nebylo správně předáváno z parent komponenty a chyběla jasná vizuální indikace stavu u malých ikon v kalendáři.
- **Řešení**:
  - `src/app/[locale]/(dashboard)/posts/page.tsx`: Opraven databázový dotaz z `select("*")` na `select("*, post_platforms(*)")` a doplněno dynamické mapování pole `post_platforms` a počítaného stavu do seznamu příspěvků (podobně jako to dělá funkce `getPosts`).
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`:
    - Ikona platformy (např. Instagram) je nyní zbarvena zeleně, pokud je status `published`.
    - K ikonám platformy byl přidán malý "badge" (fajfka pro úspěch, křížek pro chybu) pro jasnou vizuální indikaci stavu publikování.
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`:
    - Zobrazení ikon v desktopovém i mobilním kalendáři bylo rozšířeno o indikátory stavu (zelená fajfka pro `published`, červený křížek pro `failed`), aby bylo na první pohled patrné úspěšné publikování.

### Fix – Oprava chyb po Etapě 4 (Kalendář a Instagram)
- **Problém**: Po odstranění starých sloupců z tabulky `posts` v Etapě 4 (Úklid) se objevil nesoulad:
  1. Kalendář nešel načíst a hlásil `Error loading posts`.
  2. Při publikování na Instagram aplikace padala na chybějící `platform_id`.
- **Řešení**:
  - `src/app/[locale]/(dashboard)/calendar/page.tsx` a `(dashboard)/page.tsx`:
    - Změněny dotazy z `supabase.from("posts").select("*")` na `select("*, post_platforms(*)")`.
    - Nahrazeno chybné řazení přes smazaný sloupec `scheduled_at` řazením přes `created_at` (kalendář si správné `scheduled_at` spočítá až u klienta nebo v serverové iteraci přes `post_platforms`).
  - `src/lib/actions/posts.ts`:
    - Přidán debug log do `getPosts`, aby bylo možné vidět chyby, pokud dotaz selže.
  - `src/lib/actions/publish.ts`:
    - Do `publishPost` přidán fallback mechanismus pro Instagram. Pokud se z `social_accounts` nepodaří najít pro Instagram účet `platform_id` nebo `access_token`, zkusí se tyto údaje vyhledat v propojeném Facebook účtu uživatele (který často drží metadata pro Instagram byznys účty).
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`:
    - Přidána počáteční kontrola `if (!posts) return null;` a zajištěno, že iterace na ikony čte z `post_platforms`.

### COMPLETED: Etapa 4 – Úklid (Clean up starých sloupců a fallbacků)
- **Cíl**: Dokončit migraci na tabulku `post_platforms` smazáním starých sloupců z tabulky `posts` a odstraněním fallbacků z UI. Aplikace nyní 100% důvěřuje `post_platforms`.
- **Provedené změny**:
  - `supabase/migrations/025_cleanup_posts_table.sql`: Vytvořena migrace, která odstranila zastaralé RPC funkce a dropnula sloupce (`platforms`, `status`, `scheduled_at`, `published_at`, `published_platforms`, `external_id`, `external_ids`, `publish_error`, `removed_at`, `removed_from_platform`, `last_sync_at`) z tabulky `posts`.
  - `src/lib/supabase/types.ts`: Aktualizovány TypeScript typy pro tabulku `posts` (odstraněny smazané sloupce).
  - `src/lib/actions/posts.ts`:
    - Odstraněn dual-write při vytváření/upravování postů (nyní se modifikuje pouze content/media/tags atd.).
    - Přepracovány funkce `deletePost`, `syncPostStatus`, `resetPostStatus`, a `syncPublishedPosts` tak, aby četly a aktualizovaly data pouze z `post_platforms`.
    - `getPosts` a `getPost` nyní počítají agregovaný `status` a `platforms` pole dynamicky z joinnutých `post_platforms`, aby UI komponenty mohly dál používat agregovaný stav pro filtry, ale bez potřeby fallbacků do starých sloupců.
  - `src/lib/actions/publish.ts`: Odstraněn veškerý kód, který aktualizoval `posts` ohledně publikování. Nyní se stav a ID ukládají POUZE do `post_platforms`.
  - `src/components/dashboard/delete-post-dialog.tsx`: Komponenta pro smazání byla přepracována tak, aby brala dostupné sítě výhradně z `post_platforms`.
  - `src/components/edit-post-dialog.tsx` a `_post-card.tsx` a kalendář: Fallbacky z UI odstraněny; ikony, checkboxy a status bar nyní spoléhají plně na `post_platforms`.

### COMPLETED: Etapa 1 – Nová architektura (Garáž) 
- Vytvořena tabulka `post_platforms` pro nezávislou správu sítí. 
- Implementován Dual-Write v `posts.ts` (createPostAction, updatePost). 
- Migrována stávající data ze starého modelu do nového. 
- Ověřen souběžný zápis do obou tabulek (všechny testy OK).

## 2026-06-11

### Feature – Architektonická změna: Model Post + Platform Instance (Etapa 1: DB + Dual Write)

- **Cíl**: Přechod z modelu "jeden post = jeden řádek s polem platforem" na model "hlavní post + samostatné instance pro každou platformu". To umožní plně nezávislou správu stavu, plánování a chyb pro každou sociální síť zvlášť.
- **Provedené změny (Etapa 1)**:
  - `supabase/migrations/023_create_post_platforms.sql`: Vytvořena nová tabulka `post_platforms` s vazbou 1:N na `posts`. Obsahuje specifická data pro danou platformu (`status`, `scheduled_at`, `published_at`, `external_id`, `publish_error`, atd.). Byly nastaveny constraints (včetně `UNIQUE(post_id, platform)`), indexy a RLS politiky (JOIN přes parent tabulku `posts`).
  - `supabase/migrations/024_migrate_to_post_platforms.sql`: Přidán idempotentní migrační skript (s využitím `ON CONFLICT DO NOTHING`), který iteruje přes existující záznamy v `posts`, rozbalí pole `platforms` i `published_platforms` a nasype existující stav (status, časy, JSONB external ID) do odpovídajících řádků v `post_platforms`.
  - `src/lib/actions/posts.ts`: Zavedena *Dual-Write* logika do serverových akcí. 
    - `createPostAction`: Po vytvoření `posts` záznamu rovnou vytvoří pole instancí v `post_platforms` s patřičným statusem (draft / scheduled).
    - `updatePost`: Sleduje změnu v poli `platforms` z UI. Pokud jsou přidány nové sítě, založí pro ně instance; pokud jsou sítě zrušeny a přitom nebyly publikovány, smaže jejich instance z `post_platforms`.
- **Stav po 1. etapě**: Databáze je připravena a začíná zrcadlit data do nové struktury. Frontend (UI), publish proces i edge funkce stále primárně čtou ze staré tabulky `posts` (nenarušuje se tak aktuální chod aplikace).

- Změněné soubory:
  - `supabase/migrations/023_create_post_platforms.sql` (nový)
  - `supabase/migrations/024_migrate_to_post_platforms.sql` (nový)
  - `src/lib/actions/posts.ts`

## 2026-06-08

### Fix – Chybějící config_id při propojování Facebooku (DOKONČENO)

- **Problém**: Při pokusu o propojení Facebook stránky v modálu vrátil Facebook chybu "Neplatný parametr: je potřeba config_id" a propojení se nedokončilo. Důvodem bylo, že při spuštění OAuth flow pro Facebook chyběl parametr `config_id`, který Facebook Login for Business nově vyžaduje.
- **Řešení**: 
  - `src/app/[locale]/(dashboard)/accounts/page.tsx`: Do `queryParams` pro Facebook připojení byl doplněn chybějící parametr `config_id: "891876470597727"`.
  - Odstraněna stará, nepoužívaná funkce `handleFacebookOAuth`, která obsahovala duplicitní (a neaktivní) kód s chybným config_id s překlepem.
- Změněné soubory:
  - `src/app/[locale]/(dashboard)/accounts/page.tsx`

### Fix – Instagram smazání zůstávalo na síti + debug logy + RPC s user_id (DOKONČENO)

- **Problém**: Facebook se smazal fyzicky v pořádku, ale Instagram na síti ZŮSTÁVAL i když Postio hlásilo úspěch. Důvody:
  1. `deleteFromMeta` ignoroval chyby z Meta API a stejně pokračoval v odebírání platformy z DB.
  2. RPC `remove_published_platform` používala `auth.uid()` což v server-side kontextu vrací `NULL` – update se neprovedl.
- **Řešení**:
  - `src/lib/actions/publish.ts` (`deleteFromMeta`):
    - Přidány debug logy: `>>> START MAZÁNÍ Z PLATFORMY`, `>>> POUŽITÉ ID`, `>>> META RESPONSE`.
    - Pokud `resData.error` existuje, funkce NERÁZUJE platformu z DB a vrací `{ success: false, error: "..." }` – uživatel uvidí chybu.
    - Stejně při síťové výjimce (catch) – vrací chybu místo pokračování.
    - RPC volání `remove_published_platform` teď předává `p_user_id: user.id` jako třetí parametr.
  - `supabase/migrations/022_add_user_id_to_remove_published_platform.sql`: Nová migrace která přidá parametr `p_user_id UUID` do funkce a nahradí `auth.uid()` explicitním ID.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: `handleDeleteConfirm` už používá `for (const platform of selectedPlatforms) { await deleteFromMeta(...) }` – správně čeká na každé smazání sériově.

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `supabase/migrations/022_add_user_id_to_remove_published_platform.sql` (nový)

### Fix – DeletePostDialog selektivní mazání + refresh dat (DOKONČENO)

- **Problém**: I když byl příspěvek na Instagramu publikován a měl v DB uložené `external_ids`, modal pro smazání nenabízel selektivní mazání (checkboxy). Zobrazil jen prosté potvrzení. Důvod: podmínka `isPublishedMultiple` vyžadovala `status === "published"` A `published_platforms.length > 1`. Navíc `DeletePostDialog` nedostával `external_ids` z parent komponenty.
- **Řešení**:
  - `src/components/dashboard/delete-post-dialog.tsx`:
    - **Oprava logiky**: `showSelectiveDelete` se teď aktivuje pokud `effectivePlatforms.length > 0` – tedy pokud má post cokoli v `published_platforms` NEBO v klíčích `external_ids`. Už nezávisí na `status === "published"`.
    - **Refresh při otevření**: Přidán `useEffect` + `useCallback` který při otevření dialogu provede fetch z Supabase (`published_platforms, external_ids`) a aktualizuje stav. Během načítání se zobrazuje spinner "Načítám aktuální stav…".
    - **Vylepšené UI**: Každá platforma v seznamu má svou ikonu (Instagram, Facebook, LinkedIn atd.). Položka "Smazat také z aplikace Postio" má výraznější červené zvýraznění (`text-red-600`, `bg-red-50/50`, `border-red-500/25`, `font-semibold`). Pokud uživatel odškrtne mazání z aplikace, zobrazí se info text.
    - **Interface**: Přidán `external_ids?: Record<string, string> | null` do props.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`: Předává se `external_ids` do `DeletePostDialog`.

- Změněné soubory:
  - `src/components/dashboard/delete-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

### Fix – Instagram `external_id` fallback + logging (DOKONČENO)

- **Problém**: Při publikování na Instagram se v některých případech neukládalo `external_id` do DB (pokud Meta API `media_publish` vrátilo OK bez `id`), takže mazání selhávalo s chybou "externalId chybí".
- **Řešení**:
  - `src/lib/actions/publish.ts`: `publishToInstagram` – pokud `media_publish` nevrátí `id`, použije se `creation_id` jako fallback (je stále použitelný pro mazání přes Graph API). Přidán explicitní logging (`🔥 IG PUBLISH SUCCESS, final external_id`).
  - `src/lib/actions/publish.ts`: `handlePublishSuccess` – přidán logging před zápisem `external_ids` do DB.
  - `supabase/functions/process-scheduled-posts/index.ts`: Stejná oprava fallbacku na `creation_id` a vylepšený logging v edge funkci plánovače.
  - Oba soubory teď zaručují, že se `external_id` pro Instagram VŽDY uloží do `external_ids` (JSONB) ve formátu `{ instagram: "..." }`.

- Změněné soubory:
  - `src/lib/actions/publish.ts`
  - `supabase/functions/process-scheduled-posts/index.ts`

### Fix – Přechod na `external_ids` pro správné ukládání ID u více platforem (DOKONČENO)

- **Problém**: Sloupec `external_id` typu TEXT přepisoval ID první sítě při publikování na další síť, takže mazání u první sítě selhávalo (ID bylo ztraceno).
- **Řešení**:
  - `src/lib/actions/publish.ts`: Aktualizovány funkce `publishPost`, `handlePublishSuccess`, `updateRemotePostAction`, a `deleteFromMeta`, aby používaly nový JSONB sloupec `external_ids` namísto prostého TEXT `external_id`. Pro ukládání se staré ID zachová pomocí merge objektu `{ ...oldIds, [platform]: newId }`.
  - `src/lib/actions/posts.ts`: Aktualizovány funkce `deletePost`, `syncPostStatus`, `resetPostStatus`, a `syncPublishedPosts` pro práci s JSONB polem a vytahování správného ID na základě dané platformy.
  - Ošetřeno UI (`_post-card.tsx`, `delete-post-dialog.tsx`, `calendar-view.tsx`, `page.tsx`), aby pracovalo s vlastností `external_ids` napříč celou aplikací.
  - Komponenta pro smazání z více sítí teď volá správné ID v závislosti na zvolené síti.

### Fix – "Ghost" smazání z Meta API + Render error u synchronizace (DOKONČENO)

- **Problém 1**: Změny v Server Component pro `syncPublishedPosts` prováděly `revalidatePath` a `revalidateAllLocales` během renderu, což způsobovalo u Next.js render error.
- **Řešení 1**: Z funkce `syncPublishedPosts` (v `posts.ts`) byla odstraněna veškerá volání `revalidatePath` a `revalidateAllLocales`.
- **Problém 2**: Pokud byl příspěvek z Facebooku nebo Instagramu odstraněn ručně, následný pokus o smazání z aplikace selhával s chybou z Meta API ("Unsupported delete request. Object with ID does not exist"), kvůli čemuž uživatel nemohl smazat příspěvek z databáze a vyčistit UI.
- **Řešení 2**: Funkce `deleteFromMeta` (v `publish.ts`) byla upravena tak, že chyby a výjimky při API DELETE dotazu nyní nezastaví proces. V případě selhání se do logu vypíše informace a následně funkce pokračuje dál – provede smazání dané platformy z naší DB přes RPC a vrátí `success: true`. Cíl odstranit příspěvek ze sítě (už neexistuje) i z aplikace je tím splněn.

- Změněné soubory:
  - `src/lib/actions/posts.ts`
  - `src/lib/actions/publish.ts`

### Feature – Selective Delete UI (Chytrý koš) (DOKONČENO)

- **Problém**: Chybělo uživatelské rozhraní pro selektivní mazání příspěvků z Meta platforem (příprava z backendu byla hotová v minulé session).
- **Řešení**:
  - `src/components/dashboard/delete-post-dialog.tsx` – nová UI komponenta pro smazání. 'Premium Glass' design. Pokud je post na více platformách, zobrazí výběr pomocí checkmarků. Možnost smazat i kompletně z aplikace. Pro jedinou platformu klasické varování.
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – nahrazen nativní Shadcn `Dialog` za náš nový `DeletePostDialog`. Propojeno s existujícím košem.
  - V `handleDeleteConfirm` voláme v cyklu novou funkci `deleteFromMeta` pro vybrané sítě a na závěr (pokud uživatel zaškrtl) voláme `deletePost` pro smazání z lokální databáze.
  - Přidána robustní zpětná vazba: úspěšné smazání/odstranění s přesným popisem + `toast.success`, automatický `router.refresh()` pro okamžitou aktualizaci UI.

- Změněné soubory:
  - `src/components/dashboard/delete-post-dialog.tsx` (nový)
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx`

### Meta Capability Error #3 Handling + Selective Delete Preparation (DOKONČENO)

- **Problém**: Meta Graph API vrací Capability Error (#3) při vzdálené editaci publikovaných příspěvků na Facebooku. App Review je vyžadován, ale zatím neproběhl.
- **Řešení**:
  - `publish.ts` – `updateRemotePostAction` nyní detekuje capability error (kontrola `"capability"`, `#3`, `"code":3`, `"error_code":3` v odpovědi Meta API) a vrací přátelskou českou chybu: "Úprava publikovaného příspěvku na Facebooku momentálně vyžaduje dodatečné schválení aplikace ze strany Meta (App Review). V tuto chvíli nelze text na dálku změnit."
  - `publish.ts` – nová funkce `deleteFromMeta(postId, platform)` pro selektivní mazání z konkrétní platformy. Volá Meta Graph API DELETE endpoint, odebírá platformu z `published_platforms` přes RPC `remove_published_platform`, a pokud nezbyde žádná platforma, vrací status na `draft`.
  - `publish.ts` – všechny chybové cesty u editace i mazání volají `revalidatePath("/", "layout")` + `revalidateAllLocales()` pro prevenci zamrznutí UI.
  - `publish.ts` – `updateRemotePostAction` má revalidaci i v úspěšné cestě a při DB update chybě.

- Změněné soubory:
  - `src/lib/actions/publish.ts` – capability error handling, deleteFromMeta(), revalidace na všech cestách

### Fixed – TypeScript Build Error (DOKONČENO)

- Opraven TypeScript build error ve funkci `handlePublishNow` (`edit-post-dialog.tsx`): volání `updatePost` používalo proměnnou `postId`, která byla v daném místě `undefined`. Nahrazeno za `post.id`. Tím prochází produkční build na Vercelu.

### Striktní Oddělení Editace od Publikování (DOKONČENO)

- **Cíl**: Zajišťovat že `updatePost` a `publishPost` jsou naprosto oddělené světy. `published_platforms` smí měnit pouze publikační flow přes RPC.
- **Řešení**:
  - `posts.ts` – `updatePost` má explicitní komentář "STRICT SEPARATION" – `published_platforms`, `published_at`, `external_id` se extrahují a zahazují. `status` je omezen na `draft`/`scheduled`.
  - `edit-post-dialog.tsx` – `handlePublishNow` přepracován: edit flow (`updatePost`) ukládá pouze content/media/platforms, publish flow (`publishPost`) volá RPC `append_published_platform`. Komentáře jasně oddělují EDIT FLOW od PUBLISH FLOW.
  - `edit-post-dialog.tsx` – `handlePublishAdditional` volá pouze `publishAdditionalPlatforms` → RPC. Žádný `updatePost`. `router.refresh()` pro okamžitý update fajfek.
  - `edit-post-dialog.tsx` – `handleUpdateOnSocials` volá pouze `updateRemotePostAction` (text na Meta API + content v DB). Žádné publikování platforem.
  - `publish.ts` – `handlePublishSuccess` používá RPC `append_published_platform` pro atomický zápis platformy. `handlePublishError` nikdy nemodifikuje `published_platforms`.
  - SQL migrace `021_add_remove_published_platform.sql` – nová funkce `remove_published_platform` pro budoucí selektivní mazání.

- Změněné soubory:
  - `src/lib/actions/posts.ts` – STRICT SEPARATION comment
  - `src/lib/actions/publish.ts` – audit (RPC již funguje správně)
  - `src/components/edit-post-dialog.tsx` – handlePublishNow refaktor, jasné oddělení edit/publish flow
  - `supabase/migrations/021_add_remove_published_platform.sql` – nová migrace (append + remove RPC)

### Stabilizační Balíček – Robustní Publishing & UI (DOKONČENO)

- **Cíle**: Zajistit stálost zelených fajfek u publikovaných platforem, blokovat odeslání bez výběru sítě a vylepšit vizualizaci v seznamu.
- **Řešení**:
  - `posts.ts` – Server Action `createPostAction` a `updatePost` nyní natvrdo filtrují `published_platforms` z inputu. Tím je znemožněno, aby formulář náhodou přemazal stav publikování v DB.
  - `publish.ts` – `handlePublishSuccess` volá `revalidatePath("/", "layout")` IHNED po úspěšném zápisu přes RPC pro maximální čerstvost dat.
  - `edit-post-dialog.tsx` – Tlačítka "Naplánovat" a "Publikovat nyní" jsou `disabled`, pokud není vybrána žádná platforma (`platforms.length === 0`).
  - `edit-post-dialog.tsx` – Ikony již publikovaných platforem v modalu mají `opacity-60` a `pointer-events-none`, ale zelená fajfka zůstává viditelná.
  - `_post-card.tsx` – Karta příspěvku v seznamu nyní zobrazuje ikony VŠECH platforem z pole `published_platforms` vedle sebe. Pokud post ještě není publikován, zobrazují se ikony z `platforms` se sníženou opacitou.
  - `edit-post-dialog.tsx` – Všechny klíčové akce (uložení, publikování) důsledně volají `router.refresh()` pro synchronizaci UI s DB.
  - **SQL (RPC)** – Nová migrace `020_update_append_published_platform.sql` aktualizuje RPC funkci tak, aby atomicky nastavovala i `status = 'published'` a `published_at = now()`, a vracela celý řádek příspěvku.

- Změněné soubory:
  - `src/lib/actions/posts.ts` – hard-sanitize `published_platforms`
  - `src/lib/actions/publish.ts` – immediate `revalidatePath`
  - `src/components/edit-post-dialog.tsx` – button validation, icon styling, router refresh
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – multi-platform icons display
  - `supabase/migrations/020_update_append_published_platform.sql` – vylepšená RPC funkce

### Fix – Published Platforms UI Lock + Server Action Hard Sanitize (DOKONČENO)

- **Problém**: Publikovaná platforma (Instagram) zůstávala v UI označena modře, což mátlo uživatele i kód a způsobovalo mizení fajfek.
- **Řešení**:
  - `edit-post-dialog.tsx` – ikony publikovaných platforem jsou vizuálně deaktivovány: zelený border + `opacity-50` + `pointer-events-none`. Modré podsvícení (selected stav) je u published platforem odstraněno. Zelená fajfka zůstává.
  - `edit-post-dialog.tsx` – `useEffect` při načtení modalu automaticky odebírá `published_platforms` ze stavu `platforms` (cleanPlatforms filter). Publikované sítě už nejsou v aktivním výběru.
  - `edit-post-dialog.tsx` – `handlePublishNow` kontroluje `platformsToPublish` (filtruje published) místo `platforms.length`. Disabled stav tlačítka používá `unpublishedSelectedPlatforms.length === 0`.
  - `posts.ts` – `createPostAction` a `updatePost` striktně čistí `published_platforms`, `published_at`, `external_id` z inputu. Status projde pouze jako `draft` nebo `scheduled` – `published`, `publishing`, `failed` jsou zablokovány. Formulář nemůže přepsat stav publikování.
  - `posts.ts` – přidáno `revalidatePath("/", "layout")` do `createPostAction` i `updatePost` pro kompletní revalidaci cache.

- Změněné soubory:
  - `src/components/edit-post-dialog.tsx` – UI lock published platforem, auto-clean platforms, publish button logic
  - `src/lib/actions/posts.ts` – hard sanitize publishing fields, safeStatus guard, revalidatePath("/", "layout")

- Build: `npm run build` ✅ 0 chyb

### Fix – published_platforms Hard Lock + UI Refresh (DOKONČENO)

- **Problém**: Fajfky u publikovaných platforem se přemazávaly při doposílání na další platformu.
- **Řešení**:
  - `updatePost` v `posts.ts` – zakázána jakákoliv úprava `published_platforms`. Pole `published_platforms` se smaže z `updateData` před odesláním do DB. Tento sloupec smí měnit VÝHRADNě publikační logika přes RPC volání `append_published_platform`.
  - `handlePublishSuccess` v `publish.ts` – po RPC volání se čtou čerstvá data z DB (`select published_platforms`) a logují (`console.log("AKTUALIZOVANÉ PLATFORMY V DB:", ...)`). Tím lze ověřit že RPC funguje správně.
  - `edit-post-dialog.tsx` – všech 5 výskytů `window.location.reload()` nahrazeno `router.refresh()` pro Next.js friendly revalidaci. Přidán `useRouter` hook. Přidány debug logy u `handlePublishNow` a `handlePublishAdditional`.
  - RPC funkce `append_published_platform` v migraci 019 je v pořádku (deduplikace + atomický zápis).

- Změněné soubory:
  - `src/lib/actions/posts.ts` – `delete updateData.published_platforms` v updatePost
  - `src/lib/actions/publish.ts` – logging + fetch fresh data v handlePublishSuccess
  - `src/components/edit-post-dialog.tsx` – router.refresh() místo window.location.reload(), debug logy

### Fix – published_platforms Atomic Append via PostgreSQL RPC (DOKONČENO - SUPERSEDED)

- **Problém**: Druhé publikování přemazávalo první v poli `published_platforms`. JavaScript read-modify-write pattern selhával při race conditions.
- **Řešení**: Přechod na atomický zápis přímo v databázi (PostgreSQL).
  - Nová SQL migrace `019_add_append_published_platform_rpc.sql` – vytvořila RPC funkci `append_published_platform(p_post_id UUID, p_platform TEXT)`, která dělá `published_platforms = published_platforms || ARRAY[p_platform]` s deduplikací přímo v PostgreSQL. Žádný read-modify-write v JavaScriptu.
  - `handlePublishSuccess` v `publish.ts` – odstraněn read-modify-write. Nyní volá `supabase.rpc("append_published_platform", {...})` pro atomické přidání platformy do pole. Ostatní pole (status, external_id, published_at) se aktualizují samostatně bez dotyku `published_platforms`.
  - Přidán debug log: `console.log("DB UPDATE - Přidávám do pole:", platform)`.
  - Přidána `revalidatePath("/", "layout")` pro hard refresh celé Next.js cache po každém publikování.
  - UI (`edit-post-dialog.tsx`) – bez změn. `window.location.reload()` po úspěšném publikování zajistí čerstvá data z DB. `effectivePublishedPlatforms` useMemo funguje správně s novými daty.

- Změněné soubory:
  - `supabase/migrations/019_add_append_published_platform_rpc.sql` – nová RPC funkce
  - `src/lib/actions/publish.ts` – `handlePublishSuccess` (RPC + revalidatePath + debug log)

### Fix – published_platforms Append Logic + Error Handler Safety (DOKONČENO - SUPERSEDED)

- **Problém**: Při dodatečném publikování na druhou síť se první platforma z `published_platforms` mazala místo aby se k ní nová přidala.
- **Příčina**: `handlePublishSuccess` používal read-then-write pattern, který mohl ztratit data při race condition. `handlePublishError` při selhání doposílání na další síť resetoval `status` na `"failed"` a `published_at` na `null` – čímž ničil stav původního publikování.
- **Řešení**:
  - `handlePublishSuccess` – přepsán na read-append-write s `Array.from(new Set([...currentPlatforms, platform]))` pro deduplikaci. Přidáno `console.log` pro debugování. Platformy se nyní spolehlivě akumulují.
  - `handlePublishError` – nyní čte `published_platforms` před update. Pokud je post už publikován na jiné platformě (`currentPlatforms.length > 0`), uloží pouze `publish_error` bez resetu `status` a `published_at`. Reset `status: "failed"` + `published_at: null` proběhne pouze u prvního selhaného pokusu.
  - Revalidace (`revalidateAllLocales`) zůstává nezměněná – volá se po každém úspěchu i chybě.
  - Modal (`edit-post-dialog.tsx`) – žádná změna potřeba. `effectivePublishedPlatforms` již správně prochází celé pole a zelené fajfky svítí u všech publikovaných platforem.

- Změněné soubory:
  - `src/lib/actions/publish.ts` – `handlePublishSuccess` (append + dedup), `handlePublishError` (safe partial update)

### Fix – Delete Button Unresponsive + Legacy published_platforms Fallback (DOKONČENO)

- **Problém 1**: Tlačítko koše (smazat) v seznamu příspěvků nereagovalo na kliknutí – bylo pod neviditelnou z-vrstvou karty.
- **Problém 2**: U starých publikovaných postů je `published_platforms` prázdné (migrace 017 byla dodatečná). Modal ukazoval tlačítko "Publikovat na Instagram" i když post už na IG je. Mohlo dojít k duplikátu.
- **Řešení**:
  - Z-index akčních tlačítek zvýšen z `z-20` na `z-30` v `_post-card.tsx`
  - `handleDelete` v `_post-card.tsx` obalen try-catch-finally pro robustnost
  - `deletePost` v `posts.ts` – celý blok Meta API obalen dalším try-catch (outer wrapper)
  - `edit-post-dialog.tsx` – nový `effectivePublishedPlatforms` useMemo: pokud `status === 'published'` a `published_platforms` je prázdné ale `external_id` existuje, považ `platforms` za `published_platforms` (fallback pro legacy data)
  - `isInstagramPublished` nyní používá `effectivePublishedPlatforms` místo `post?.platforms`
  - `unpublishedSelectedPlatforms` a zelená fajfka u platforem také používají `effectivePublishedPlatforms`
  - `EditPostData` interface rozšířen o `external_id?: string | null`
  - Propagace `external_id` v `_post-card.tsx`, `posts/page.tsx`, `calendar/_calendar-view.tsx`, `calendar/_calendar-client.tsx`
  - SQL migrace `018_backfill_published_platforms.sql` – backfill `published_platforms = platforms` pro všechny existující published posty s prázdným polem

- Změněné soubory:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – z-30, try-catch, external_id
  - `src/lib/actions/posts.ts` – outer try-catch wrapper v deletePost
  - `src/components/edit-post-dialog.tsx` – effectivePublishedPlatforms fallback
  - `src/app/[locale]/(dashboard)/posts/page.tsx` – external_id mapping
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – external_id v Post + handlePostClick
  - `src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx` – external_id v Post typu
  - `supabase/migrations/018_backfill_published_platforms.sql` – backfill starých dat

- Build: `npm run build` ✅ 0 chyb

### Feature – Additional Publishing (Publish to More Platforms Later) (DOKONČENO)

- **Problém**: Stav `published` blokoval celý příspěvek, i když uživatel chtěl přidat další platformu.
- **Řešení**: Nový sloupec `published_platforms` (TEXT[]) v tabulce `posts` – ukládá názvy sítí, kde už odeslání proběhlo. Uživatel může vzít publikovaný post a dodatečně ho "doposlat" na další platformu.

- `supabase/migrations/017_add_published_platforms_to_posts.sql` – nová migrace:
  - `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_platforms TEXT[] DEFAULT '{}';`

- `src/lib/actions/publish.ts` – úpravy:
  - `handlePublishSuccess`: po úspěšném odeslání čte `published_platforms`, přidá platformu a zapisuje zpět
  - Nový server action `publishAdditionalPlatforms({ postId, platform })` – publikuje post na jednu novou platformu, která ještě není v `published_platforms`. Stejná publish logika (Instagram 2-phase + Facebook media types), ale jen pro jednu cílovou platformu.

- `src/components/edit-post-dialog.tsx` – dynamické UI:
  - `EditPostData` rozšířen o `published_platforms` (volitelné)
  - Import `publishAdditionalPlatforms` + `Check` z lucide-react
  - Nový state `isPublishingAdditional`
  - `useMemo` `unpublishedSelectedPlatforms` – vybrané platformy které nejsou v `published_platforms`
  - `useMemo` `canPublishAdditional` – true pokud je alespoň jedna nová platforma zaškrtnutá
  - Handler `handlePublishAdditional` – volá `publishAdditionalPlatforms` pro jednu platformu
  - Zelená fajfka (`Check` ikona) u platforem v `published_platforms`
  - Action buttons u published postů: pokud `canPublishAdditional` → tlačítko "Publikovat na {Platforma}" pro každou novou zaškrtnutou platformu (s ikonou + loader). Původní tlačítka "Zrušit" + "Aktualizovat na sítích" zůstávají.

- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče (v calendar i posts):
  - `publishToSelected`: "Publikovat" / "Publish" / "Опублікувати"
  - `additionalPublishSuccess`: "Příspěvek byl publikován" / "Post has been published" / "Публікацію опубліковано"

- Propagace `published_platforms` v datech:
  - `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – `PostListItem` typ + mapování do `EditPostDialog`
  - `src/app/[locale]/(dashboard)/posts/page.tsx` – mapování z DB do `PostsList`
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – `Post` interface + `handlePostClick` mapování
  - `src/app/[locale]/(dashboard)/calendar/_calendar-client.tsx` – `Post` typ

- Build: `npm run build` ✅ 0 chyb

### Fix – Published Post UI: No Duplicate Publish + Update on Socials (DOKONČENO)

- **Problém**: Uživatel viděl u publikovaného postu tlačítko "Publikovat nyní", což mohlo vytvořit duplikát.
- **Řešení**: Při `status === 'published'` se tlačítka "Uložit koncept", "Naplánovat" a "Publikovat nyní" skryjí a nahradí je:
  - "Aktualizovat na sítích" – volá `updateRemotePostAction`, pošle nový text na `external_id`.
  - "Zrušit" – zavře modal.
- `src/components/edit-post-dialog.tsx`:
  - Nový `useMemo` `mediaChanged` – detekuje změnu médií u publikovaných postů.
  - Nový handler `handleUpdateOnSocials` – volá `updateRemotePostAction` s `content.trim()`.
  - Action buttons: conditionální render. Published → "Zrušit" + "Aktualizovat na sítích". Ostatní stavy → původní tlačítka.
  - Tlačítko "Aktualizovat na sítích" je `disabled` pokud `mediaChanged === true`.
  - Varovný banner (`AlertTriangle`) pod médii: "U publikovaného postu lze měnit pouze text..."
  - Interface rozšířen o `updateOnSocials`, `onlyTextUpdatePossible`, `cancel`.
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče v `calendar` i `posts`:
  - `updateOnSocials`: "Aktualizovat na sítích" / "Update on Socials" / "Оновити в соцмережах"
  - `onlyTextUpdatePossible`: "U publikovaného postu lze měnit pouze text..." / "For published posts, only text can be changed..." / "Для опублікованих публікацій можна змінювати лише текст..."
- Propagace props: `posts/page.tsx`, `calendar/_calendar-view.tsx`, `_posts-container.tsx`, `_post-card.tsx` – přidány `updateOnSocials`, `onlyTextUpdatePossible`.
- `updateRemotePostAction` v `publish.ts` zůstává beze změny – již správně posílá pouze text na Meta API.
- Build: `npm run build` ✅ 0 chyb

### Feature – Remote Edit (DOKONČENO)

- `src/lib/actions/publish.ts` – nový server action `updateRemotePostAction(postId, newContent)`:
  - Najde v DB příspěvek, získá `external_id` a `access_token` (z `social_accounts`)
  - Facebook: POST na `https://graph.facebook.com/v20.0/{external_id}` s `{ message: newContent, access_token }`
  - Instagram: POST na `https://graph.facebook.com/v20.0/{external_id}` s `{ caption: newContent, access_token }`
  - Aktualizuje pouze `content` v lokální DB
  - Revaliduje `/calendar`, `/posts`, `/dashboard`
- `src/components/edit-post-dialog.tsx` – integrace Remote Editu:
  - Import `updateRemotePostAction` místo `updatePublishedPost`
  - V `handleSubmit`: když `status === "published"` → volá `updateRemotePostAction`
  - Kontrola změny media: pokud se media liší od originálu → toast error "Změna fotky u publikovaného postu není možná. Pro změnu fotky musíte příspěvek publikovat znovu."
  - Toast úspěch: "Text byl upraven v Postio i na sociální síti."
  - Nové volitelné labely v interface: `remoteEditSuccess`, `photoChangeNotAllowed`
- `src/messages/cs.json`, `en.json`, `uk.json` – překlady:
  - `remoteEditSuccess`: "Text byl upraven v Postio i na sociální síti." / "Text has been updated in Postio and on the social network." / "Текст оновлено в Postio та в соціальній мережі."
  - `photoChangeNotAllowed`: "Změna fotky u publikovaného postu není možná..." / "Changing a photo on a published post is not possible..." / "Зміна фото в опублікованій публікації неможлива..."
- Interface updates v `_post-card.tsx` (×2), `_posts-container.tsx` – přidány volitelné labely
- `posts/page.tsx` – propagace `remoteEditSuccess`, `photoChangeNotAllowed` z translations
- `calendar/_calendar-view.tsx` – fallback hodnoty pro nové labely
- Build: `npm run build` ✅ 0 chyb

### Fix – Instagram-Only Publishing (DOKONČENO)

- Validace "Pro publikování vyber Facebook" odstraněna ze všech 4 míst:
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - `src/components/edit-post-dialog.tsx`
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`
- Podmínka změněna z `!platforms.includes("facebook")` na `platforms.length === 0` — nyní stačí jakákoliv platforma (instagram NEBO facebook)
- Všechna volání `publishToFacebook()` nahrazena za `publishPost()` — router v `publishPost()` automaticky rozliší platformu z DB a zavole `publishToInstagram()` nebo Facebook publish logiku
- Toast messages obecné: "Příspěvek byl úspěšně publikován!" místo "na Facebooku"
- `resetPostStatus` ("Publikovat znovu") potvrzeno — funguje správně: `removed_externally` → `draft`
- Build: `npm run build` ✅ 0 chyb

### Feature – Auto Sync Trigger for External Removal Detection (Krok 34) (DOKONČENO)

- `supabase/migrations/016_add_last_sync_at_to_posts.sql` – nová migrace:
  - Nový sloupec `last_sync_at` (TIMESTAMPTZ) pro throttling synchronizace
- `src/lib/actions/posts.ts` – nový server action `syncPublishedPosts`:
  - Najde všechny posty se statusem `published` + `external_id`, kde `last_sync_at` je starší než 30 minut (nebo NULL)
  - Pro každý post GET na Meta Graph API (`/v20.0/{external_id}?fields=id`)
  - Pokud API vrátí 404/400 → post označí jako `removed_externally` (status, `removed_at`, `removed_from_platform`, `last_sync_at`)
  - Pokud post existuje → jen update `last_sync_at`
  - Revaliduje `/posts`, `/calendar`, `/dashboard` pokud došlo ke změnám
- `src/app/[locale]/(dashboard)/posts/page.tsx` – při načtení stránky:
  - Zavolá `syncPublishedPosts()` **před** načtením seznamu postů
  - Díky tomu se DB aktualizuje a následný select vrátí posty se správným statusem
  - UI se „přebarví" automaticky – oranžový badge + červené upozornění
- Ochrana API limitů: 30min cooldown mezi synchronizacemi (last_sync_at)
- Tlačítko "Publikovat znovu" (`resetPostStatus`) již fungovalo – resetuje `removed_externally` → `draft`
- Build: `npm run build` ✅ 0 chyb

### Feature – Robust Delete + External Removal Detection (Krok 33) (DOKONČENO)

- `supabase/migrations/015_add_removed_externally_status.sql` – nová migrace:
  - Rozšíření CHECK constraintu na `posts.status` o hodnotu `removed_externally`
  - Nové sloupce `removed_at` (TIMESTAMPTZ) a `removed_from_platform` (TEXT)
  - Index `posts_removed_at_idx` pro efektivní filtrování
- `src/lib/actions/posts.ts` – robustní mazání + nové akce:
  - **`deletePost`**: try-catch kolem Meta API volání. Pokud API vrátí 404/400 nebo error code 190/1 (Object not found/deleted), NEHÁŽÍ chybu – místo toho označí post jako `removed_externally` s `removed_at` a `removed_from_platform`. Uživatel se nikdy "nezasekne".
  - **`syncPostStatus`** (nový): GET na Meta API pro zjištění, zda `external_id` stále existuje. Pokud ne, nastaví `status = 'removed_externally'`.
  - **`resetPostStatus`** (nový): Resetuje `removed_externally` post zpět na `draft` (maže `external_id`, `removed_at`, `removed_from_platform`). Umožňuje "Publikovat znovu".
  - **`updatePost`**: typ `status` rozšířen o `removed_externally`
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – UI změny:
  - Nový status styl `removed_externally` (oranžový badge)
  - Červené upozornění s ikonou `AlertTriangle`: "Odstraněno přímo na [Platforma] dne [Datum]"
  - Tlačítko "Publikovat znovu" (`RotateCcw` ikona) – volá `resetPostStatus`
  - `PostListItem` rozšířen o `removed_at` a `removed_from_platform`
  - `deletePost` handler rozliší `removedExternally: true` → `router.refresh()` místo `onDeleted`
- `src/app/[locale]/(dashboard)/posts/page.tsx` – mapování `removed_at`, `removed_from_platform` z DB
- `src/app/[locale]/(dashboard)/posts/_posts-container.tsx` – propagace nových props
- `src/components/post-filters-row.tsx` – volitelný filtr `removed_externally` (přidán pokud je label k dispozici)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – oranžový styl pro `removed_externally` v kalendáři
- `src/messages/cs.json`, `en.json`, `uk.json` – překlady:
  - `statusRemovedExternally`: "Odstraněno externě" / "Removed Externally" / "Видалено зовні"
  - `republish`: "Publikovat znovu" / "Republish" / "Опублікувати знову"
  - `removedExternallyMsg`: "Odstraněno přímo na {platform}" / "Removed directly from {platform}" / "Видалено безпосередньо з {platform}"
- Build: `npm run build` ✅ 0 chyb

### Feature – Full Post Control: Caption Builder, Meta Delete, Published Post Editing (Krok 32) (DOKONČENO)

- `src/lib/caption.ts` – nový utility soubor s funkcí `buildFinalCaption()`:
  - Sestaví finální popisek: `content` + `\n📍 location` + `\n#tag1 #tag2 #tag3`
  - Location se přidá pouze pokud existuje (ve formátu "📍 [místo]")
  - Tags se normalizují (pokud nemají `#`, přidá se) a spojí s mezerou
  - Exportován jako čistá funkce (ne Server Action) pro použití v publish.ts i UI
- `src/lib/actions/publish.ts` – integrace caption builderu do všech publish cest:
  - **`publishPost`**: select query nyní includuje `location, tags`. Všechna volání Meta API používají `finalCaption` místo raw `content`.
  - **Facebook video**: `description` → `finalCaption`
  - **Facebook gallery**: `message` → `finalCaption`
  - **Facebook single photo**: `caption` → `finalCaption`
  - **Facebook text-only**: `message` → `finalCaption`
  - **Instagram**: `caption` → `finalCaption` (v Phase 1 container creation)
  - **Nový Server Action `updatePublishedPost`**: Editace již publikovaných příspěvků na sociálních sítích:
    - Kontroluje `status === 'published'` a `external_id`
    - Rozliší platformu: Instagram → param `caption`, Facebook → param `message`
    - POST na `https://graph.facebook.com/v20.0/{external_id}` s novým caption
    - Aktualizuje lokální DB (content, location, tags)
    - Revaliduje `/calendar`, `/posts`, `/dashboard`
- `src/lib/actions/posts.ts` – oprava mazání z Instagramu:
  - **`deletePost`**: Nyní mazá z obou Meta platfor (Facebook i Instagram)
  - Podmínka změněna z `platforms.includes("facebook")` na `post.status === "published"`
  - Hledá access_token pro `targetPlatform` (první platformu v poli) přes `.ilike()`
  - Obě platformy používají stejný endpoint: `DELETE https://graph.facebook.com/v20.0/{external_id}?access_token={token}`
  - Přidáno logování: mazání, odpověď API, úspěch/ selhání
- `src/components/edit-post-dialog.tsx` – integrace editace publikovaných postů:
  - Import `updatePublishedPost` z publish.ts
  - V `handleSubmit`: když `status === "published"`, volá `updatePublishedPost` místo `updatePost`
  - Po úspěšné editaci na sociální síti: toast + close dialog + reload
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace caption builderu do Edge funkce:
  - **`buildFinalCaption()`**: Stejná logika jako v `src/lib/caption.ts` (standalone pro Edge runtime)
  - **Select query**: přidáno `location, tags`
  - **Publish loop**: `finalCaption` použit pro obě platformy (Instagram i Facebook)
- Build: `npm run build` ✅ 0 chyb

### Fix – Instagram OAuth config_id + Verified Publishing (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – přidán `config_id` do Instagram OAuth queryParams:
  - `config_id: '891876470597727'` – při propojování se otevře růžové Meta okno s brandingem z Meta portálu
- `src/lib/actions/publish.ts` – potvrzeno: Instagram publishing engine funguje (dvoufázový container process):
  - Fáze 1: POST `/{ig_user_id}/media` s `image_url`/`video_url` + `caption` → `creation_id`
  - Fáze 2: (3s/10s delay) POST `/{ig_user_id}/media_publish` s `creation_id` → publikováno
  - Rozlišení FOTO (`image_url` + `media_type: IMAGE`) a VIDEO (`video_url` + `media_type: REELS`)
- `supabase/functions/process-scheduled-posts/index.ts` – potvrzeno: Edge funkce má stejnou Instagram logiku syncnutou
- Build: `npm run build` ✅ 0 chyb

### Feature – Direct Instagram Login (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – OAuth logika v modalu nyní rozlišuje Instagram od Facebooku:
  - **PRO INSTAGRAM**: OAuth scopes `public_profile,email,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,business_management` (bez pages_* scopeů). Callback URL obsahuje `&platform=instagram`.
  - **PRO FACEBOOK**: Původní scopes s `pages_show_list,pages_read_engagement,pages_manage_posts` zůstávají nezměněny.
  - Warning text v modalu se liší: pro Instagram pouze "Profesionální účet (Business/Creator)" – zmínka o "Facebook Stránce" odstraněna.
  - Žádný demo/mock režim – po kliknutí se vždy otevře reálné OAuth okno.
- `src/app/auth/callback/route.ts` – nová logika pro Instagram Direct Login:
  - **Platform hint**: `next` parametr se parsuje pro `platform=instagram` query param.
  - **Instagram Direct flow**: Když `requestedPlatform === "instagram"`, callback nejprve volá `/me` + `/me?fields=instagram_business_account` pro získání vlastního IG účtu uživatele (bez nutnosti FB Page).
  - **Fallback**: Pokud `/me` vrátí ID, uloží se jako Instagram účet s `platform: 'instagram'`.
  - **FB Pages**: Stále se načítají, ale při Instagram Direct Login se FB Pages přeskočí (pokud již byl nalezen přímý IG účet). IG účty propojené s Pages se stále přidávají jako duplicitní ochrana.
  - **Logy**: `[Postio] Instagram Direct Login – hledám vlastní IG účet uživatele`, `[Postio] NALEZEN PŘÍMÝ INSTAGRAM: ...`
- `src/messages/cs.json`, `en.json`, `uk.json` – přidán `connectModal.warningDescInstagram` klíč:
  - CS: "Tato funkce vyžaduje Profesionální účet (Business/Creator)."
  - EN: "This feature requires a Professional account (Business/Creator)."
  - UK: "Ця функція вимагає Професійний акаунт (Business/Creator)."
- Build: `npm run build` ✅ 0 chyb

### Feature – Unified Connect Account Modal (Krok 22) (DOKONČENO)

- `src/components/connect-account-modal.tsx` – nový univerzální informační modal pro Facebook i Instagram:
  - **Design**: 'Premium Glass' styl (`bg-white/10 dark:bg-black/40`, `backdrop-blur-xl`, `rounded-[24px]`).
  - **Šířka**: `max-w-xl` (cca 500-600px) – texty na tlačítkách se už neusekávají.
  - **Hlavička**: Logo sítě (FB/IG) v gradient boxu + nadpis "Propojit [Název sítě]".
  - **Seznam funkcí (checkmarks)**: Automatické publikování, analytika, AI asistent.
  - **Upozornění**: Amber warning box – "Tato funkce vyžaduje Profesionální účet (Business/Creator) nebo Facebook Stránku."
  - **Hlavní tlačítko**: `w-full py-4 text-base font-semibold` s indigo/purple gradientem.
  - **Odkaz dole**: "Máte osobní účet? Zjistěte, jak jej přepnout." → odkaz na Facebook Business Help.
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – logika kliknutí na Facebook i Instagram nyní otevírá informační modal před OAuth přesměrováním:
  - Starý `AccountTypeModal` (dvousloupcový Professional | Personal) nahrazen jedním `ConnectAccountModal`.
  - Facebook kliknutí už NEPŘESMĚRUJE rovnou na FB – nejprve zobrazí modal s informacemi.
  - Instagram kliknutí rovněž používá stejný unifikovaný modal.
  - OAuth scopes zůstávají: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts`.
- `src/messages/cs.json`, `en.json`, `uk.json` – přidána `connectModal` sekce s 8 klíči:
  - `title`, `autoPublishing`, `analytics`, `aiAssistant`, `warningTitle`, `warningDesc`, `connectButton`, `learnMore`
  - Žádná MISSING_MESSAGE chyba.
- Build: `npm run build` ✅ 0 chyb

### Fix – Real Instagram via Meta Graph API + Logging (DOKONČENO)

- `src/app/auth/callback/route.ts` – přidáno detailní logování pro debug Instagram integrace:
  - **Log při hledání IG**: `"Hledám Instagram pro stránku: [název stránky]"`
  - **Log při nalezení IG**: `"NALEZEN REÁLNÝ INSTAGRAM: [username]"`
  - **Log při chybě API**: vypíše chybu z Meta Graph API
  - **Log při upsertu**: ukazuje kolik účtů se ukládá + platformy + platform_id
  - **Log chyb upsertu**: pokud Supabase vrátí chybu při ukládání
  - Instagram se ukládá DO teprve pokud API vrátí platné `ig.id` – žádné prázdné/demo záznamy
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – potvrzeno: žádný demo/falešný Instagram kód. Data pouze z `social_accounts`.
- `supabase/migrations/012_social_accounts_avatar_url_and_constraints.sql` – potvrzeno: unikátní index `(user_id, platform, platform_id)` existuje. Upsert zabraňuje duplikátům.

### Fix – Instagram OAuth Connection (Krok 31.0) (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – OAuth scopes upraveny na přesný požadovaný seznam:
  - **Před**: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts,ads_management,business_management`
  - **Nyní**: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts`
  - Odstraněna nepotřebná práva `ads_management` a `business_management`
  - Upraveno na obou místech: `handleFacebookOAuth()` + `onProfessional` (AccountTypeModal)
- `src/app/auth/callback/route.ts` – callback již obsahuje plnou podporu Instagram Business Account:
  - Pro každou Facebook Page se ptá na `instagram_business_account`
  - Pokud stránka má propojený Instagram, uloží jej jako samostatný řádek (`platform: 'instagram'`) s tokenem Facebook stránky
  - Upsert s `onConflict: "user_id,platform,platform_id"` zabraňuje duplikátům
- Zobrazení na `/accounts` – karty se již správně renderují podle `platform` v DB (Facebook i Instagram jako samostatné karty se správnými ikonami)

### Feature – Instagram Publishing (Single Media, Two-Phase Container) (DOKONČENO)

- `src/lib/actions/publish.ts` – přidána podpora publikování na Instagram:
  - **Nová funkce `publishToInstagram`**: Dvoufázový IG Container proces přes Meta Graph API:
    - **Fáze 1 (Vytvoření kontejneru)**: POST `https://graph.facebook.com/v20.0/{ig_user_id}/media` s `image_url`/`video_url` + `caption` + `access_token`. Z odpovědi získáme `creation_id`.
    - **Fáze 2 (Zveřejnění)**: Počkáme 3s (foto) nebo 10s (video) a pošleme POST `https://graph.facebook.com/v20.0/{ig_user_id}/media_publish` s `creation_id` + `access_token`.
  - **Nová funkce `publishPost`**: Unifikovaný router, který podle `platforms[0]` v DB rozhodne zda volat Facebook nebo Instagram logiku.
  - **`publishToFacebook` zůstává jako backward-compatible alias** – všechna stávající volání fungují dále bez změn.
  - **Instagram text-only validation**: Pokud `mediaUrls` je prázdné, vrátí chybu `"Instagram vyžaduje alespoň jeden obrázek nebo video."`
  - **Shared helpers**: `handlePublishSuccess` / `handlePublishError` pro sdílené DB update + revalidaci.
  - **Logy**: `"Vytvářím IG kontejner..."`, `"IG kontejner vytvořen, creation_id: ..."`, `"Publikuji IG kontejner..."`, `"IG publikováno úspěšně, id: ..."`
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace Instagram logiky do Edge funkce:
  - **Funkce `publishToInstagram`**: Stejná dvoufázová logika jako v server action (container → publish).
  - **Publish loop rozšířen**: `if (targetPlatform === "instagram")` větev hledá Instagram účet v `social_accounts` a volá `publishToInstagram`. Facebook větev zůstává `else if`.
  - **Deploy příkaz**: `npx supabase functions deploy process-scheduled-posts --project-ref=TVOJ_PROJECT_REF`
- Build: `npm run build` ✅ 0 chyb

### Fix – Multi-photo Facebook gallery: attached_media format + Edge function sync (DOKONČENO)

- `src/lib/actions/publish.ts` – oprava `attached_media` formátu pro Facebook Multi-photo API:
  - **Před**: `JSON.stringify(mediaIds)` → `["id1","id2"]` (špatný formát, Facebook přijal jen první fotku)
  - **Nyní**: `JSON.stringify(mediaIds.map(id => ({media_fbid: id})))` → `[{"media_fbid":"id1"},{"media_fbid":"id2"}]` (správný formát)
  - Přidán log: `console.log("Nahrávám galerii s počtem fotek:", photoUrls.length)`
  - Log feed request ukazuje finální `attached_media` payload pro debug
- `supabase/functions/process-scheduled-posts/index.ts` – synchronizace multi-photo logiky do Edge funkce:
  - **Funkce `publishToFacebook`**: Signatura změněna z `mediaUrl: string | null` na `mediaUrls: string[]`
  - **4 větve**: video (1), galerie (2+ fotky), single photo (1), text-only
  - **Galerie**: Každá fotka uploadnuta jako `published=false` → shromáždění ID → `attached_media` s `{media_fbid}` formátem → POST na `/{pageId}/feed`
  - **Volání v loopu**: `mediaUrl` → `filteredUrls` (pole všech URL)
  - **Deploy příkaz**: `npx supabase functions deploy process-scheduled-posts --project-ref=TVOJ_PROJECT_REF`
- Build: `npm run build` ✅ 0 chyb

### Fix – Post buttons click, multi-photo Facebook gallery, robust publish, NextImage warnings (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – oprava nereagujících tlačítek Upravit/Smazat:
  - Kontejner tlačítek: přidán `z-20` pro správný stacking context
  - Oba Buttony: přidán `relative z-20` pro zajištění interaktivity
  - Media preview container: přidán `pointer-events-none` aby obrázek neblokoval kliknutí na tlačítka v rohu
- `src/lib/actions/publish.ts` – kompletní přepis `publishToFacebook` s podporou více fotek:
  - **Více fotek (galerie)**: Každá fotka se nejprve uploadne jako `published=false` na `/{pageId}/photos`. Poté se všechny ID shromáždí do `attached_media` pole a pošle se jeden POST na `/{pageId}/feed` s `message` + `attached_media`. Výsledek: galerie na Facebooku.
  - **Jedna fotka**: Původní rychlý postup přes `/{pageId}/photos` s `caption`.
  - **Video**: `/{pageId}/videos` s `file_url` + `description`.
  - **Text**: `/{pageId}/feed` s `message`.
  - **Robustní error handling**: Status se změní na `published` POUZE pokud Meta API vrátí platné `id`. Pokud API vrátí chybu nebo žádné ID, status je `failed` s chybovým textem.
  - **Debug logy**: Specifické logy pro každý typ média ("ODESÍLÁM GALERII FOTEK", "PUBLIKUJI GALERII", atd.)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – oprava NextImage varování:
  - `width={0} height={0}` + `sizes="100vw"` + `style={{ width: "100%", height: "auto" }}` místo pevných `width={240} height={96}`
  - Eliminuje aspect-ratio mismatch varování v terminálu
  - `unoptimized` zachováno pro externí URL z Supabase storage
- Build: `npm run build` ✅ 0 chyb

### Feature – Posts List: Media previews, flex layout, Premium Glass redesign (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – kompletní redesign karty příspěvku pro profesionální galerii obsahu:
  - **Flex layout**: Na desktopu obrázek vlevo + text vpravo (`sm:flex-row`), na mobilu obrázek nahoře + text dole (`flex-col`).
  - **Náhled média**: Pokud příspěvek má `media_urls`, zobrazí se první prvek jako miniatura. Desktop: `w-48 aspect-square`, mobil: plná šířka `aspect-video`. Styl: `object-cover rounded-xl border border-white/10`.
  - **Video detekce**: Soubory `.mp4`/`.mov` se renderují jako `<video>` s Play ikonou overlay (`bg-black/30` + kulaté glass tlačítko s Play šipkou).
  - **Multi-media badge**: Pokud příspěvek má více než 1 médium, v rohu náhledu se zobrazuje `+N` badge (glassmorphism).
  - **Text vylepšení**: Obsah příspěvku je `text-base` (dříve `text-lg`) s `line-clamp-3` aby karty nebyly extrémně dlouhé.
  - **Action tlačítka**: Upravit + Smazat přesunuta do pravého horního rohu (`absolute top-5 right-5`). Na desktopu se zobrazují při hoveru (`sm:opacity-0 group-hover:sm:opacity-100`), na mobilech vždy viditelná.
  - **Premium Glass styl**: Karta má `relative group`, `bg-white/80 dark:bg-card/40`, `backdrop-blur-md`, `rounded-[24px]`, `shadow-[0_8px_30px_rgba(0,0,0,0.06)]`. Action tlačítka mají vlastní glass efekt (`bg-white/60 dark:bg-white/5 backdrop-blur-sm`).
  - **Status + platform icon**: Zarovnány v horní části textového bloku vedle sebe.
  - **Footer**: Datum + naplánovaný čas zarovnány dole s `mt-auto` a `border-t`.
  - **Light/dark mode**: Karty čitelné v obou režimech (mléčné sklo v light, tmavý glass v dark).
  - Build: `npm run build` ✅ 0 chyb

### Fix – AI Backend: Gemini 3.1 Flash-Lite + AQ klíč + edge runtime (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – kompletní aktualizace AI backendu pro Gemini 3.1 Flash-Lite a klíče typu 'AQ':
  - **Odstraněna AIza validace** – smazán `apiKey.startsWith("AIza")` check + regex validace. Klíče 'AQ' (Bound Keys/Service Account) jsou nyní plně podporovány bez formátové kontroly.
  - **Model změněn**: `gemini-2.0-flash-lite` → `gemini-3.1-flash-lite` (nejnovější verze pro rok 2026).
  - **Edge runtime**: přidán `export const runtime = "edge"` pro minimální latenci.
  - **Nové system prompty (čeština)**:
    - `improve`: "Vylepši text příspěvku pro sociální sítě. Zachovej tón, oprav chyby, buď úderný. Vrať pouze čistý text bez uvozovek."
    - `shorten`: "Zkrať tento text na maximum pro Twitter/X při zachování smyslu."
    - `hashtags`: "Na základě textu vygeneruj 5-10 relevantních hashtagů. Vrať je jako řetězec oddělený mezerami, bez čárek."
  - **Error handling pro AQ klíče**: Při 401/403 chybě se do console vypíše `"AI AUTH ERROR: Prověř vazbu klíče na Service Account."`
  - **Demo fallback** zachován – pokud klíč chybí, API vrací demo response bez pádu.
  - Žádné změny v UI/designu. Pouze funkční změny v API route.
  - Build: `npm run build` ✅ 0 chyb

### Fix – AI Asistent: debug logování, API key validation, demo fallback, model update (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – rozsáhlé debug logování pro diagnostiku chyb AI generování:
  - **Logování na vstupu**: `console.log("AI REQUEST RECEIVED, ACTION:", action)` – vidíme jakou akci uživatel zvolil
  - **Kontrola API klíče**: `console.log("API KEY PRESENT:", !!apiKey)` – ověření zda klíč existuje v env
  - **Validace formátu klíče**: Kontrola `apiKey.startsWith("AIza")` – reálné Gemini klíče začínají `AIza...`. Pokud ne, error log s prvních 10 znaky klíče + jasná chybová zpráva pro frontend
  - **Error detaily v catch**: `console.error("AI GENERATION ERROR:", error)` + `error.message`, `error.name`, `error.stack`
  - **Logy před/po Gemini volání**: "Sending prompt to Gemini..." + "Gemini response received, length: N"
- **Demo fallback**: Pokud `GOOGLE_GEMINI_API_KEY` chybí nebo je prázdný, API vrátí `isDemo: true` + statický text pro danou akci (`improve`/`shorten`/`hashtags`). UI se nerozhodí a uživatel vidí že tlačítko funguje.
- **Model změněn**: `gemini-1.5-flash` → `gemini-2.0-flash-lite` (free tier). Původní model `gemini-1.5-flash` byl vyřazen z API v1beta a vracel 404 Not Found.
- **Frontend logování**: `src/components/ai-assistant-button.tsx` – přidán `console.log("AI API Response:")` pro debug response z API v prohlížeči
- **Root cause**: `gemini-1.5-flash` není dostupný pro free tier API klíče. Řešení: `gemini-2.0-flash-lite` je free a funguje.

### Feature – AI Asistent (Gemini 1.5 Flash) – kompletní implementace (DOKONČENO)

- `src/app/api/ai/generate/route.ts` – nový POST endpoint pro AI generování obsahu přes Gemini 1.5 Flash. Podporuje 3 akce: `improve` (vylepšení stylu/gramatiky), `shorten` (zkrácení pro Twitter/X 280 znaků), `hashtags` (generování 5-10 relevantních hashtagů). API klíč z `process.env.GOOGLE_GEMINI_API_KEY`.
- `src/components/ai-assistant-button.tsx` – reusable komponenta: skleněné tlačítko s ikonou Sparkles + DropdownMenu pro výběr 3 akcí. Design: `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg`. Loading stav s animovaným Loader2 + "AI přemýšlí...". Výsledek `improve`/`shorten` nahradí text, `hashtags` se přidá do tagů. Toast notifikace (sonner) pro success/error.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněna sekce `ai` s klíči: `aiAssistant`, `improveText`, `shortenText`, `generateTags`, `aiThinking`, `aiSuccess`, `aiError`, `aiEmptyContent`.
- **Integrace do všech 3 míst tvorby příspěvků:**
  - `src/app/[locale]/(dashboard)/posts/new/page.tsx` – AI tlačítko vedle Content textarea (přes `useTranslations("ai")`)
  - `src/components/edit-post-dialog.tsx` – AI tlačítko v edit modalu (přes `tAi` props, kondiční render)
  - `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – AI tlačítko v inline formuláři kalendáře + v EditPostDialog
- **Props chain pro tAi:**
  - `calendar/page.tsx` → `CalendarClient` → `CalendarView` (server `getTranslations` pro "ai" namespace)
  - `posts/page.tsx` → `PostsContainer` → `PostsList` → `PostCard` → `EditPostDialog`
  - `calendar/_calendar-view.tsx` → `EditPostDialog` (přes `tAi` props)
- Knihovna `@google/generative-ai` již nainstalovaná v package.json
- Build: `npm run build` ✅ 0 chyb

### Fix – Propojení Facebooku z ikonové mřížky znovu otevírá OAuth + callback zachová existující session (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – klik na Facebook (a Instagram Professional přes modal) znovu používá `supabase.auth.signInWithOAuth({ provider: 'facebook', ... })`, aby se vždy otevřelo Facebook OAuth okno/redirect.
- `src/app/auth/callback/route.ts` – pokud už uživatel měl v prohlížeči session, callback ji po výměně `code` obnoví (`setSession`) a pouze uloží tokeny/účty do `social_accounts` pod původním `user_id` (bez „přepnutí“ na OAuth session).

### Fix – Root layout: React 19 chyba se `<script>` + Supabase env proměnná (DOKONČENO)

- `src/app/layout.tsx` – theme init skript přesunut z `<head>` do `<body>` a použit `dangerouslySetInnerHTML`, aby se eliminovala runtime chyba Reactu 19 „script tag while rendering React component“ a skript se vykonal před hydratací.

## 2026-05-29

### Fix – Propojování Facebooku necreateuje nové auth.users (account linking místo OAuth login) (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – pro „Propojit Facebook“ a Instagram Professional se používá `supabase.auth.linkIdentity` (ne `signInWithOAuth`), takže se nemění primární session e-mailového uživatele a nevznikají nové řádky v `auth.users`.
- `src/app/auth/callback/route.ts` – callback nejdřív načte existujícího uživatele ze session; při uložení `provider_token` ukládá data do `social_accounts` pod původním `user_id` a při již existující session nespouští 2FA redirect.

## 2026-05-28

### Fix – Edge Function: anti-duplikace příspěvků (scheduled → publishing lock) (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – oprava duplicitního odesílání na Facebook:
  - **Lock mechanismus**: Hned po výběru příspěvků se jejich status změní z `scheduled` na `publishing` (batch update `.in("id", ...).eq("status", "scheduled")`)
  - **Anti-duplikace**: Pokud se Edge funkce spustí dvakrát ve stejnou vteřinu, druhá instance nenajde žádné `scheduled` příspěvky (už jsou `publishing`) a skončí early return
  - **Early exit**: Pokud není žádný `scheduled` příspěvek, funkce okamžitě vrátí HTTP 200 s `totalFound: 0`
  - **Error handling**: Všechny DB update v loopu a catch bloku nyní checkují `.eq("status", "publishing")` místo `scheduled`
  - **Status flow**: `scheduled` → `publishing` (lock) → `published` (success) nebo `failed` (error)
  - **DB constraint**: `posts.status` CHECK rozšířen o `publishing` → povolené hodnoty: `('draft', 'scheduled', 'publishing', 'published', 'failed')`

### Fix – Edge Function: TypeScript error u accountError?.message (DOKONČENO)

---

## 2026-05-27

- `supabase/functions/process-scheduled-posts/index.ts` – řádek 291: `accountError?.message` hlásil TypeScript error "Property 'message' does not exist on type...". Opraveno type assertion na `(accountError as { message?: string } | null)?.message` protože import přes `esm.sh` nemá silně definovaný typ `PostgrestError`.

### Fix – Edge Function: robustní logování hledání Facebook účtu (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – vylepšený lookup Facebook účtu:
  - Přidán log před dotazem: `Hledám účet pro user_id: {id} a platformu: facebook`
  - Přidán log výsledku dotazu: `accountError`, `accountsFound`, `accounts` (pro debug)
  - Rozlišená chyba: pokud není nalezen žádný účet → `CHYBA: Účet pro uživatele [ID] nebyl v social_accounts nalezen.`
  - Pokud účet existuje ale chybí `access_token`/`platform_id` → původní error message
  - Case-insensitive `.ilike("platform", "facebook")` již funguje správně

### Feature – Edge Function: reálné publikování na Facebook s detekcí typu média (DOKONČENO)

- `supabase/functions/process-scheduled-posts/index.ts` – kompletní přepis Edge funkce:
  - **Nová funkce `publishToFacebook`**: Reálné odesílání příspěvků na Facebook přes Meta Graph API s plnou detekcí typu média.
  - **Detekce média**: `detectMediaType()` analyzuje `media_urls[0]` a vybírá správný endpoint:
    - **FOTO** (.jpg, .png, .webp) → `/{pageId}/photos` s parametry `url` + `caption`
    - **VIDEO** (.mp4, .mov) → `/{pageId}/videos` s parametry `file_url` + `description`
    - **TEXT** → `/{pageId}/feed` s parametrem `message`
  - **Logging**: Přidán vstupní log `console.log(">>> Checking for scheduled posts...")` a detailní logy pro každý krok (načtení postů, zpracování, Facebook API odpověď).
  - **Autorizace**: Podpora `service_role` klíče přes hlavičku `apikey` (pro Cron Job) i `Authorization: Bearer` (pro manuální testování).
  - **DB update**: Po úspěšném publikování se nastaví `status = 'published'`, `published_at`, `external_id` (Facebook post ID) a `scheduled_at = null`. Při chybě `status = 'failed'` + `publish_error`.
  - **Facebook účet**: Hledá aktivní Facebook účet uživatele přes `.ilike("platform", "facebook")` a bere `access_token` + `platform_id`.
  - **Analytics**: Vkládá záznam do `analytics` tabulky pouze při úspěšném publikování.
  - **Error handling**: Při unexpected error se post automaticky označí jako `failed` s chybovým textem.

### Stav systému po této aktualizaci

- ✅ `supabase/config.toml` – `verify_jwt = false` (již bylo nastaveno)
- ✅ `supabase/functions/process-scheduled-posts/index.ts` – reálné publish na Facebook s media detekcí
- ✅ `src/lib/actions/posts.ts` – `createPostAction` již správně ukládá `status: 'scheduled'`
- ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx` – tlačítko "Naplánovat" volá `handleSubmit("scheduled")`
- ✅ `src/components/edit-post-dialog.tsx` – tlačítko "Naplánovat" volá `handleSubmit("scheduled")`
- ✅ `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – podpora `status: "scheduled"`

## 2026-05-26

### Fix – Publikování a plánování: case-insensitive account lookup, 5 min tolerance, debug logy (DOKONČENO)

- `src/lib/actions/publish.ts` – dotaz na `social_accounts` nyní používá `.ilike("platform", "facebook")` (case-insensitive), aby se nenašel účet s "Facebook" / "FACEBOOK". Při chybě dotazu nebo chybějícím tokenu/platform_id se vypíšou VŠECHNY záznamy z `social_accounts` do terminálu (`DEBUG - Všechny účty v DB`) pro snadné ladění.
- `src/lib/actions/publish.ts` – před odesláním na Meta Graph API se loguje detail: `console.log("ODESÍLÁM NA FACEBOOK...", { platform_id, text, mediaType, mediaUrl, url })`.
- `src/lib/actions/posts.ts` – `createPostAction` a `updatePost` nově mají 5 minut toleranci u validace času: `scheduled.getTime() < Date.now() - 5 * 60 * 1000`. Uživatel může naplánovat i čas, který právě nastal (do 5 min zpět), což řeší chybu "Čas je v minulosti" při pomalém kliknutí.
- `src/components/locale-switcher.tsx` – zkontrolováno: žádné "login" v textu, přepínač zobrazuje správně "Čeština" / "English" / "Українська".

### Fix – Stabilita auth redirectů (DOKONČENO)

- `middleware.ts` – redirect na `/{locale}/login` probíhá jen pro dashboard routy bez session; `/` nově vede na `/cs` (ne přímo na login).
- `src/app/auth/callback/route.ts` – zjednodušený callback: žádné debug logy, jeden finální `NextResponse.redirect(new URL(next, request.url))`, cookies se bezpečně přenesou do redirect response.
- `src/app/[locale]/(dashboard)/layout.tsx` – do server layoutu přidán `console.log("CURRENT USER:", user?.id)` pro debug session v terminálu.

### Feature – Facebook publish: podpora fotek a videí + striktní plánování (DOKONČENO)

- `src/lib/actions/publish.ts` – `publishToFacebook` nově detekuje typ media podle `media_urls[0]` a volí Graph API endpoint: `/videos` (mp4/mov), `/photos` (jpg/png/webp), jinak `/feed` (text).
- `src/lib/actions/publish.ts` – loguje odpověď z Meta Graph API (`console.log("META RESPONSE:", ...)`) a po úspěchu ukládá `id` do `posts.external_id`.
- `src/lib/actions/posts.ts` – `deletePost` při `posts.external_id` volá smazání z Facebooku přes `DELETE /{external_id}`.
- `src/lib/actions/posts.ts` – validace pro `scheduled`: vyžaduje validní datum v budoucnosti; revalidace po vytvoření/úpravě jde na `/calendar` a `/posts`.
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – „Publikovat nyní“ v modal formuláři nyní opravdu publikuje přes `publishToFacebook` (místo pouhého uložení se statusem `published`).

### Fix – UI: mazání příspěvků + default čas v plánování (DOKONČENO)

- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/app/[locale]/(dashboard)/posts/_posts-container.tsx`, `src/app/[locale]/(dashboard)/posts/page.tsx` – mazání příspěvku nyní používá stejný potvrzovací dialog (Radix/shadcn) jako mazání propojeného účtu (místo browser confirm).
- `src/components/ui/date-time-picker.tsx` – výchozí čas v plánování je nyní aktuální čas (místo 12:00), pokud ještě není vybrané datum/čas.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny překlady pro potvrzení smazání příspěvku (texty sjednoceny tónem s potvrzením mazání účtů).

## 2026-05-25

### Fix – Mazání propojených účtů: potvrzení + skutečné odstranění z DB (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – koš nyní otevře potvrzovací dialog a po potvrzení smaže řádek v `social_accounts` (nejen `is_active=false`), takže účet zmizí i ze Supabase.
- `src/app/[locale]/(dashboard)/page.tsx`, `src/components/dashboard/setup-guide.tsx` – počty/progress nyní počítají jen aktivní účty (`is_active=true`), aby se dashboard nespletl při případných historických záznamech.
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny překlady pro potvrzení smazání.

### Feature – Uložení FB stránek + IG Business účtů z Graph API do social_accounts (DOKONČENO)

- `src/app/auth/callback/route.ts` – po Facebook OAuth se bere `provider_token` a volá Graph API `/me/accounts?fields=id,name,access_token,instagram_business_account,picture{url}`; ukládají se **Facebook stránky** (page access token + avatar) a k nim napojené **Instagram Business** účty (username + profile picture) přes upsert.
- `supabase/migrations/012_social_accounts_avatar_url_and_constraints.sql` – přidán `avatar_url`, rozšířen `platform` CHECK o `youtube,tiktok` a doplněn unikátní klíč `(user_id, platform, platform_id)` pro bezpečný upsert (bez duplicit).
- `src/lib/supabase/types.ts` – typ `social_accounts` rozšířen o `avatar_url`.
- `src/components/dashboard/setup-guide.tsx` – průvodce „Dokončete nastavení“ nově periodicky/focus re-checkuje stav, takže se úkol „Propojit první síť“ odškrtne i bez refresh.

## 2026-05-23

### Feature – Facebook OAuth pro přímé propojení + Redesign karet účtů (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – kompletní redesign stránky propojených účtů:
  - **Facebook OAuth pro přímé kliknutí**: Klik na Facebook ikonu nyní spouští reálné Facebook OAuth (`handleFacebookOAuth`) místo formuláře s manuálními inputy. Scopes: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,ads_management,business_management`.
  - **Instagram Professional**: Stále přes `AccountTypeModal` → "Propojit Professional účet" → Facebook OAuth (už fungovalo).
  - **Instagram Personal + ostatní platformy**: Twitter, LinkedIn, YouTube, TikTok – stále formulář s manuálními inputy (OAuth pro tyto platformy zatím není nakonfigurován).
  - **Redesign karet propojených účtů**: Nový glassmorphism design (`max-w-2xl mx-auto bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-6`). Vlevo velký kulatý avatar (56px) s gradient pozadím, vedle něj jméno účtu a název platformy. Vpravo zelený svítící bod s ping animací + "Aktivní" + tlačítko odpojení (Trash ikona).
  - **Podpora avatar_url**: Typ `SocialAccount` rozšířen o `avatar_url` a `platform_id` pro budoucí použití profilovek z Facebook Graph API.
  - **Logika prázdného stavu**: "Žádné propojené účty" s PlusCircle se zobrazuje POUZE pokud není žádný aktivní účet. Jakmile je alespoň jeden účet propojen, prázdný stav úplně zmizí.
  - **Počet propojených účtů**: Header ukazuje pouze aktivní účty (`accounts.filter((a) => a.is_active).length`).
  - **Odstraněny nepoužité importy**: `Card`, `CardContent`, `Badge`, `Plus` (lucide-react).

### Feature – Reálné Facebook OAuth propojení účtů (DOKONČENO)

- `src/app/auth/callback/route.ts` – po návratu z Facebook OAuth se nyní extrahuje `provider_token` (access_token) a automaticky ukládá do `social_accounts` tabulky. Graph API volání (`/me` + `/me/accounts`) vyzvedávají profil a propojené Instagram účty. Bez tohoto kroku se token ztrácel a účty byly jen "demo".
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – `onProfessional` handler rozšířen o `ads_management,business_management` scopes + `next=/cs/accounts` redirect parametr + `auth_type: rerequest` pro opakované požadování oprávnění.
- `supabase/migrations/011_add_platform_id_to_social_accounts.sql` – nová migrace: přidán `platform_id` sloupec (TEXT, nullable) do `social_accounts`. Ukládá Facebook Page ID nebo Instagram Account ID potřebné pro publish přes Graph API.
- `src/lib/supabase/types.ts` – typ `social_accounts` rozšířen o `platform_id: string | null` + platform enum rozšířen o `youtube`, `tiktok`.
- `src/components/account-type-modal.tsx` – `onProfessional` typ změněn na `() => void | Promise<void>` pro správné async/await.

### Feature – Facebook OAuth pro propojení Instagram Professional účtu (DOKONČENO)

- `src/app/[locale]/(dashboard)/accounts/page.tsx` – `onProfessional` callback v `AccountTypeModal` nyní spouští Facebook OAuth přes Supabase (`signInWithOAuth`) místo manuálního zadání access tokenu. Scopes: `public_profile,email,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement` (nezbytné pro budoucí publish fotek na Instagram).
- `src/app/auth/callback/route.ts` – redirect po úspěšném OAuth směřuje na `/accounts` (místo obecného dashboardu), aby uživatel okamžitě viděl stav propojených účtů.
- `.env.local` – přidána `NEXT_PUBLIC_FACEBOOK_APP_ID` (client-side přístup k ID Facebook aplikace).

### Fix – Probliknutí light mode při přihlášení/odhlášení (DOKONČENO)

- `src/app/layout.tsx` – server-side default pro `<html class="dark">` je nyní zapnutý, pokud cookie `theme` není explicitně `light` (tzn. i při chybějící cookie se SSR renderuje v dark). Tím se eliminuje krátký „light flash“ při full reloadu během auth redirectů (login/logout).

### Fix – Google OAuth návrat do dashboardu házel hydration mismatch (DOKONČENO)

- `src/components/dashboard/setup-guide.tsx` – odstraněn `typeof window` branch při SSR (četl localStorage už během renderu) → nově `ready` state načte `setup-dismissed` až v `useEffect` a komponenta do té doby renderuje `null`, takže server i klient mají při hydrataci identické HTML; zároveň Supabase browser klient je cachovaný přes `useRef` (stabilní deps, bez opakovaných requestů).
- `src/app/layout.tsx` – anti-flash theme init skript přes `next/script` (`strategy="beforeInteractive"`) místo inline `<script dangerouslySetInnerHTML>`, aby se vyhnul React warningu o `<script>` při renderu a pořád běžel ještě před hydratací.

### Fix – Responzivita modálu pro výběr typu účtu (Instagram connect) na mobilech (DOKONČENO)

- `src/components/account-type-modal.tsx` – odstraněn `min-w-[600px]` (způsoboval horizontální overflow na mobilech) + obsah má nyní `max-h` podle viewportu a `overflow-y-auto`, aby byl celý modál použitelný i na menších displejích; zároveň lehce upravené paddingy/gapy pro mobile.

### Fix – Login na localhostu nefungoval při použití Supabase publishable key (DOKONČENO)

- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/app/auth/callback/route.ts` – Supabase klienti nyní berou klíč z `NEXT_PUBLIC_SUPABASE_ANON_KEY` nebo fallback `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nové Supabase klíče), takže autentizace funguje i při nové konfiguraci env.
- `middleware.ts` – detekce „Supabase je nakonfigurována“ nyní počítá i s `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a hlídá `placeholder` hodnoty.
- `src/lib/actions/auth.ts`, `src/components/auth/email-signin.tsx` – email login/signup přes Server Action (`emailAuthAction`) pro spolehlivé setnutí session cookies na serveru; signup používá `emailRedirectTo: /auth/callback`.
- `src/components/auth/google-signin-button.tsx` – Google OAuth `redirectTo` má fallback na `window.location.origin` pokud chybí `NEXT_PUBLIC_APP_URL` + v UI se nově zobrazí konkrétní chyba od Supabase (pomáhá odhalit špatně nastavené Redirect URLs v Supabase/Google).

### Fix – Kalendář/time picker umožňuje výběr minut (DOKONČENO)

- `src/components/ui/date-time-picker.tsx` – minuty v pickeru jsou nyní 0–59 místo pouze 0/15/30/45, takže při plánování příspěvků lze nastavit čas po minutách.
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `scheduled_at` se nyní ukládá i při uložení jako koncept (pokud je čas vyplněn), takže se čas publikování neztrácí po refreshi.
- `src/components/ui/date-time-picker.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – opravený bug kdy se při změně minut/hodin ukládal čas s minutami `00` (race condition ve state); zároveň se `scheduled_at` už nepřevádí přes `toISOString().slice(0, 16)`, aby nedocházelo k posunům času.
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`, `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – `scheduled_at` se před uložením normalizuje na validní ISO timestamp (včetně timezone), aby se do DB nikdy neposílal “naivní” čas bez pásma a nedocházelo k rozhození plánování.
- `supabase/functions/process-scheduled-posts` – doplněné lokální TS typy pro Deno/URL importy, aby v editoru nezobrazovaly falešné TypeScript chyby.

### Fix – Cron → Edge Function auth pro nové sb_secret (ECC) klíče (DOKONČENO)

- `supabase/config.toml` – pro `process-scheduled-posts` nastaveno `verify_jwt = false`, aby Edge Runtime nezkoušel parsovat `sb_secret_...` jako JWT (řeší `UNAUTHORIZED_INVALID_JWT_FORMAT` ještě před spuštěním funkce).
- `supabase/functions/process-scheduled-posts/index.ts` – autentizace preferuje hlavičku `apikey` a porovnává ji proti `SUPABASE_SECRET_KEYS` (default secrets v Edge Functions) + fallback na legacy `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase Dashboard → Edge Functions → `process-scheduled-posts` → Settings – `Verify JWT` vypnuto (OFF), aby gateway nevyžadovala `Authorization: Bearer <user-jwt>` pro cron/pg_net volání.
- Ověřeno ručně přes `curl`: `apikey: sb_secret_...` → `HTTP 200` a response `{"ok":true,...}`.
- SQL (Supabase Dashboard → SQL Editor) – cron job musí posílat `sb_secret_...` v hlavičce `apikey` (NE v `Authorization: Bearer ...`):

```sql
-- pokud už job existuje, nejdřív ho smažte
select cron.unschedule('process-scheduled-posts-job');

-- znovu naplánujte se správnou hlavičkou apikey
select cron.schedule(
  'process-scheduled-posts-job',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://rfgortcdptfmmonsqjtp.supabase.co/functions/v1/process-scheduled-posts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', '<sb_secret_...>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Refactor – Navigace: 5 hlavních položek + Nastavení submenu + badge dot (DOKONČENO)

- `src/app/[locale]/(dashboard)/layout.tsx` – hlavní navigace zredukovaná na přesně 5 položek (Přehled, Příspěvky, Kalendář, Účty, Nastavení); dřívější Šablony/Analytika/Zprávy přesunuté do submenu pod Nastavení.
- `src/components/dashboard/sidebar.tsx` – desktop sidebar vyčištěn na 5 položek; Nastavení rozbaluje inline submenu (Šablony, Analytika, Zprávy NEW, Profil, Předvolby, Notifikace, Obecné, Fakturace, Štítky, Upgrade, Odhlásit se) + dot indikátor, pokud je v submenu něco „nepřečteného“.
- `src/components/dashboard/mobile-nav.tsx`, `src/components/dashboard/mobile-nav-wrapper.tsx` – mobile bottom tab bar má pouze 5 položek; Nastavení otevírá menu se všemi sekundárními položkami; dot indikátor na Nastavení (NEW pro Zprávy) se schová po první návštěvě `/inbox` (localStorage `postio:seen:inbox`).
- `src/app/[locale]/(dashboard)/page.tsx` – v „Rychlé akce“ přidány rychlé vstupy na Šablony a Analytiku vedle „Nový příspěvek“ (podle referenčního návrhu).

## 2026-05-09

### Fix – Supabase middleware session refresh pro ECC (P-256) JWT klíče (DOKONČENO)

- Supabase v projektu používá nové **asymetrické** podpisové klíče **ECC (P‑256)** pro JWT (nový bezpečnostní standard; klíče v env mají prefix `sb_`).
- V Next.js middleware (Edge runtime) je nutné aktivně vynutit server-side validaci session, jinak může docházet k náhodným logoutům kvůli neproběhlému refreshi JWT cookie s novými ECC klíči.
- `src/lib/supabase/middleware.ts` – upraven `cookies.setAll` na oficiální `@supabase/ssr` middleware pattern:
  - nastavuje cookies do `request` i `response`
  - po setnutí cookies re-generuje `NextResponse.next({ request: { headers } })` aby Edge runtime viděl aktuální session
- `middleware.ts` – explicitní `await supabase.auth.getUser()` probíhá před redirect logikou; response se bere až po případném refreshi cookie

## 2026-05-07

### Fix – Hydration mismatch v MobileNav + Dark mode flash při navigaci (DOKONČENO)

**Problém 1 – Hydration failed (MobileNav):**
- Server renderoval RSC placeholder pro `MobileNav`, klient renderoval `<nav>` element
- Next.js hlásil hydration mismatch: `<nav>` (client) vs `<div>` (server)
- Příčina: `MobileNav` (use client) byl přímo v `DashboardLayout` (Server Component) – při SSR se neshodovalo HTML

**Oprava 1 – Client-side only rendering MobileNav:**
- `mobile-nav-wrapper.tsx` – nový client wrapper: `useState(false)` + `useEffect(setMounted(true))`
- Renderuje `null` při SSR (mounted=false), `<MobileNav>` až po client mountu
- `layout.tsx` – swap `MobileNav` → `MobileNavWrapper`
- Žádný hydration mismatch – server i klient vidí `null` při hydrataci

**Problém 2 – Dark mode bliká light mode při přechodu mezi stránkami:**
- Při navigaci se `DashboardLayout` re-renderuje a `ThemeProvider` se re-initializuje
- Na krátký moment není na `<html>` class `dark` → problikne light pozadí
- Root layout `serverThemeClass` řešil pouze `theme=dark`, ne `theme=system`

**Oprava 2 – Anti-flash theme script:**
- `src/app/layout.tsx` (root) – inline `<script>` v `<head>`:
  - Čte `theme` cookie ještě před React hydration
  - Pokud `system` → detekuje `prefers-color-scheme: dark` media query
  - Okamžitě nastaví `dark` class na `<html>` – zero flash
- `serverThemeClass` → `isDark` – default `system` = dark (většina uživatelů má dark)
- `theme-provider.tsx` – přidaný `mounted` state guard proti dvojitému aplikování theme

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Filtry na stránce Příspěvky + SetupGuide modal persistence (DOKONČENO)

**Problém 1 – Filtry na stránce "Příspěvky" nefungovaly:**
- Klik na filtr (např. YouTube) změnil URL query params přes `<Link>` ale data se neaktualizovala bez manuálního obnovení stránky
- Příčina: `_posts-filters.tsx` používal `<Link>` elementy pro navigaci, `page.tsx` (Server Component) filtroval data na serveru podle searchParams, ale `PostsList` (client component) měl vlastní `useState(initialPosts)` který se při client-side navigaci nepřerenderoval
- Kalendář fungoval správně protože používal `<button>` + lokální state + `useMemo` pro client-side filtrování

**Oprava 1 – Client-side filtrování jako v Kalendáři:**
- `_posts-filters.tsx` – kompletní přepsání: `<Link>` → `<button>` s `onClick` handlerem, nový `onFilterChange` callback props, odstraněn `locale` prop a `buildHref` funkce
- `_post-card.tsx` – `PostsList` zjednodušen: odstraněn interní state pro posts (pouze renderuje co dostane), nový `onDeleted` callback props, export `PostListItem` typ
- `_posts-container.tsx` – **nový** client wrapper component:
  - Drží shared state filtrů (`activePlatform`, `activeStatus`)
  - `useMemo` pro client-side filtrování posts podle platformy i statusu
  - Kombinuje header + filtry + posts list + empty states
  - Manage delete operace + refresh po smazání posledního postu
- `page.tsx` – zjednodušena: fetchuje všechny posts bez server-side filtrů, předává do `PostsContainer`
- Odstraněny nepoužité importy (`Button`, `Plus`, `FileText`, `Link`, `PostsList`, `PostsFilters`)

**Problém 2 – SetupGuide modál "Dokončete nastavení" se vrátil po refreshi:**
- Uživatel zavřel modál tlačítkem X → `dismissed` state = `true` → modál zmizel
- Po obnovení stránky se state resetoval na `false` → modál se znovu zobrazil
- Příčina: `dismissed` stav byl pouze v React state, žádná persistencia

**Oprava 2 – localStorage persistence:**
- `setup-guide.tsx` – `dismissed` state se inicializuje z `localStorage` (lazy initializer)
- `handleDismiss` callback – nastaví state i `localStorage.setItem("setup-dismissed", "true")`
- Import `useCallback` pro optimalizaci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Supabase "Lock stolen" runtime error (DOKONČENO)

**Problém:** `Lock "lock:sb-...-auth-token" was released because another request stole it` – runtime error v `edit-post-dialog.tsx`. Příčina: každý `EditPostDialog` (jeden na každý post card) volal `createClient()` při každém renderu, což vytvořilo nové instance Supabase browser klienta. Když stránka měla 30+ postů, 30 instancí volalo `getUser()` současně v useEffect a Supabase interní mutex pro cookie parsing se mezi sebou "kradl".

**Oprava:**
- `edit-post-dialog.tsx` – Supabase klient se nyní cachuje v `useRef` (singleton pattern). `getUser()` se volá pouze když je dialog otevřený (`open` prop) a `userId` ještě není nastavená. Přidán try/catch guard.
- `profile-form.tsx` – totéž `useRef` cachování klienta pro konzistenci

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Null-safe výpočty v analytics dashboardu (DOKONČENO)

**Problém:** Když migrace 010 nebyla aplikována v Supabase (sloupce `likes`, `comments`, `shares`, `clicks`, `saves` neexistují), vracely se tyto hodnoty jako `null`. V `analytics-dashboard.tsx` se sčítaly přímo (`existing.likes + a.likes`), což při `null` vracelo `NaN` a rozbíjelo grafy i metrické karty.

**Oprava:**
- `dailyData` useMemo – všechny aritmetické operace nyní s `?? 0` fallback: `(existing.likes ?? 0) + (a.likes ?? 0)`
- `postsWithAnalytics` useMemo – totéž
- `dailyData` output – `likes`, `comments`, `shares` mapují na `?? 0` pro BarChart data
- `totals` useMemo už měl `?? 0` guard – OK
- Typ `AnalyticsRecord` má detailní sloupce jako `number | null` – správně

**Poznámka:** SQL migrace 010 zatím nebyla aplikována do Supabase. Fallback v `actions.ts` vkládá pouze `impressions + engagements` pokud detailní sloupce chybí. Dashboard nyní správně handle null hodnoty.

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – Analytika Dashboard s Recharts (DOKONČENO)

**Cíl:** Implementace kompletního Analytics dashboardu s grafy, metriky a filtry časového období.

**Nové soubory:**
- `src/app/[locale]/(dashboard)/analytics/analytics-dashboard.tsx` – Client Component s Recharts grafy:
  - **8 metrických karet**: Dosah (Reach), Interakce, ER%, Lajky, Komentáře, Sdílení, Kliknutí, Uloženo
  - **Area Chart** – Výkon v čase: Zobrazení, Interakce, Lajky (indigo/purple/rose gradienty)
  - **Bar Chart** – Lajky, Komentáře, Sdílení (rose/amber/cyan gradienty)
  - **Top Posts** – Seznam nejlepších příspěvků s detailními metrikami
  - **Filtr období** – 7 dní, 30 dní, 3 měsíce (pill toggle buttons)
  - **Design**: Glassmorphism karty (20px radius), barevné ikony s gradienty, glow efekty
  - **Empty states** – Purple glow + BarChart3 ikona + i18n texty
- `src/app/[locale]/(dashboard)/analytics/actions.ts` – Server Actions:
  - `generateDemoAnalytics()` – vygeneruje 30 realistických demo posts + analytics záznamů
  - Metriky: impressions (500–5500), engagements (2–10% z impressions), likes/comments/shares/clicks/saves
  - Platformy: instagram, facebook, twitter,.linkedin (random distribuce)
  - Data rozložena do posledních 90 dní
- `supabase/migrations/010_extend_analytics_table.sql` – DB migrace:
  - Nové sloupce v `analytics`: `likes`, `comments`, `shares`, `clicks`, `saves` (INT, DEFAULT 0)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – kompletně přepsaný Server Component:
  - Fetchuje posts + analytics z Supabase pro aktuálního uživatele
  - Auto-generuje demo data pokud jsou obě tabulky prázdné
  - Předává data do `AnalyticsDashboard` client componentu
- `src/lib/supabase/types.ts` – rozšířený typ `analytics` o nové sloupce (Row/Insert/Update)
- `src/messages/cs.json` – rozšířený namespace `analytics` (14 nových klíčů):
  - `subtitle`, `reach`, `engagementRate`, `noDataSubtitle`
  - `last7Days`, `last30Days`, `last3Months`
  - `overview`, `performanceOverTime`, `postsPerformance`
  - `averageReach`, `totalLikes`, `totalComments`, `totalShares`, `clicks`, `saves`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině

**Dependency:**
- `npm install recharts` – knihovna pro interaktivní grafy (AreaChart, BarChart, Tooltip, Legend)

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Demo posts insert UUID error (DOKONČENO)

**Problém:** `generateDemoAnalytics()` v `actions.ts` posílal manuálně generované string ID (`demo-post-${user.id}-${i}`) do `posts` tabulky, která očekává UUID. Supabase vrátil error `42804: invalid input syntax for type uuid`.

**Řešení:**
- Odstraněno ruční `id` z `demoPosts` – DB generuje UUID přes `uuid_generate_v4()`
- Po insertu posts: `.select("id")` vrací skutečná UUID z DB
- Analytics insert nyní používá skutečná `post_id` UUID z `insertedPostIds[]`
- Odstraněno `.single()` – vrací všechny řádky z batch insertu

**Build:** `npm run build` – úspěšně, TypeScript OK

### Krok – 2FA Login Flow (DOKONČENO)

**Fix – `useActionState` outside of transition error:**
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – odstraněn manuální `handleSubmit` + `isVerifying` state
- `<form action={formAction}>` – formAction se předává přímo jako `action` prop → Next.js automaticky obalí volání do `startTransition`
- `isPending` z `useActionState` stačí pro loading state, ruční `isVerifying` není potřeba

**Fix – `NEXT_REDIRECT` swallowed by catch block:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – `catch (e)` chytal `NEXT_REDIRECT` error z `redirect()` a vracel `{ error: "internal_error" }` místo redirectu
- Nyní: `if (e instanceof Error && e.message === "NEXT_REDIRECT") { throw e; }` – redirect errors projdou nahoru
- **Fix – `otplib.verify()` return value:** – otplib vrací `{ valid: true, delta: 0 }` místo booleanu → `typeof result === "boolean" ? result : result.valid`

**Cíl:** Po přihlášení uživatele s aktivní 2FA přesměrovat na verifikační stránku `/login/verify-2fa` místo dashboardu.

**Nové soubory:**
- `src/app/[locale]/(auth)/login/verify-2fa/actions.ts` – Server Actions pro ověření 2FA kódu při přihlášení:
  - `verify2FACode()` – ověří TOTP kód proti `two_factor_secret` z DB nebo recovery kód proti `two_factor_recovery_codes`
  - `signOutFrom2FA()` – odhlášení z verifikační stránky
- `src/app/[locale]/(auth)/login/verify-2fa/verify-form.tsx` – Client Component formulář:
  - 6místný TOTP kód (výchozí) / 8místný recovery kód (přepínač)
  - Visual display prázdných boxů pro jednotlivé číslice
  - Error messages + loading state
- `src/app/[locale]/(auth)/login/verify-2fa/page.tsx` – Server Component stránka:
  - Logo + glassmorphism card layout
  - LocaleSwitcher + link zpět na login

**Opravené soubory:**
- `src/components/auth/email-signin.tsx` – po úspěšném `signInWithPassword`:
  - Dotaz na `users.two_factor_enabled` pro přihlášeného uživatele
  - Redirect na `/[locale]/login/verify-2fa` pokud je 2FA enabled
  - Redirect na `/[locale]` (dashboard) jinak
- `src/app/auth/callback/route.ts` – po úspěšném `exchangeCodeForSession` (Google OAuth):
  - Stejná kontrola `two_factor_enabled`
  - Redirect na `verify-2fa` nebo dashboard
- `middleware.ts` – přidán `/verify-2fa` do `publicPatterns` aby byla route přístupná bez auth redirectu
- `src/messages/cs.json`, `en.json`, `uk.json` – 15 nových klíčů v namespace `auth`:
  - `verify2FATitle`, `verify2FASubtitle`, `verify2FAPlaceholder`, `verify2FASubmit`, `verify2FAVerifying`
  - `verify2FAError`, `verify2FARetry`, `verify2FABackToLogin`
  - `verify2FAUseRecoveryCode`, `verify2FARecoveryCodeTitle`, `verify2FARecoveryCodeDesc`
  - `verify2FARecoveryCodePlaceholder`, `verify2FARecoveryCodeSubmit`, `verify2FARecoveryCodeError`, `verify2FASwitchToTOTP`

**Build:** `npm run build` – úspěšně, TypeScript OK

### Fix – Chybějící překlad `settings.loading` (DOKONČENO)

**Problém:** `MISSING_MESSAGE: Could not resolve 'settings.loading' in messages for locale 'cs'` – tlačítko v `Setup2FADialog` volalo `t("loading")` s namespace `"settings"`, ale klíč `loading` existoval pouze v sekci `common`.

**Řešení:** Přidán klíč `loading` do sekce `settings` ve všech třech jazycích:
- `src/messages/cs.json` – `"loading": "Načítání..."`
- `src/messages/en.json` – `"loading": "Loading..."`
- `src/messages/uk.json` – `"loading": "Завантаження..."`

### Fix – Bezpečný 2FA Verification Flow (DOKONČENO)

**Problém:** 2FA se zapnula okamžitě po kliknutí na tlačítko bez ověření TOTP kódu. Uživatel jen zadával libovolný text a ten se ukládal jako "secret". Žádný QR kód, žádné ověření proti Google Authenticator.

**Řešení:** Implementován bezpečný 3fázový proces aktivace 2FA:

1. **Inicializace (Pending)**: Klik na "Zapnout 2FA" otevře modální dialog → Server Action `generate2FASetup()` vygeneruje `two_factor_secret` (otplib) + QR kód (qrcode library) → QR se zobrazí uživateli
2. **Ověření (Handshake)**: Uživatel naskenuje QR kód v Google Authenticator, zadá 6místný TOTP kód do modálu → klikne "Potvrdit a aktivovat"
3. **Finální aktivace**: Server Action `confirm2FASetup()` ověří TOTP kód proti secretu → pokud je správný: `two_factor_enabled = true`, uloží secret, vygeneruje 8 záchranných kódů → zobrazí recovery codes screen

**Nové soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/setup-2fa-dialog.tsx` – Client Component modální dialog pro nastavení 2FA:
  - **Step 1 (Setup)**: QR kód + tajný kód + vstupní pole pro 6místný TOTP kód
  - **Step 2 (Recovery)**: Seznam 8 záchranných kódů + tlačítko kopírovat + potvrzení uložení
  - Design: Glassmorphism, 20px radius, barevné ikony (indigo/purple/amber)
  - Veškeré texty v češtině/angličtině/ukrajinštině (i18n)

**Opravené soubory:**
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts`:
  - Odstraněn `enable2FA` (starý nebezpečný action)
  - Nový `generate2FASetup()` – generuje secret + QR code data URL
  - Nový `confirm2FASetup(formData)` – ověřuje TOTP kód, generuje recovery codes, ukládá do DB
  - Importy: `otplib` (generateSecret, generateURI, verify) + `qrcode` (toDataURL)
  - `disable2FA` zůstává beze změny
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx`:
  - Odstraněn starý formulář s `verification_code` inputem
  - Nové tlačítko "Zapnout 2FA" → otevře `Setup2FADialog`
  - Nový state `show2FADialog` + handler `handle2FASuccess()`
  - Odstraněn `enable2FAAction` + `handleEnable2FA`
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx`:
  - Přidán `twoFASuccess` label do props
- `src/messages/cs.json` – 18 nových klíčů: `setup2FATitle`, `setup2FAStep1-3`, `verificationCodeLabel`, `verificationCodePlaceholder`, `confirmAndEnable`, `secretCode`, `qrCodeInstructions`, `invalidCode`, `recoveryCodesTitle`, `recoveryCodesDescription`, `recoveryCodesWarning`, `copyRecoveryCodes`, `recoveryCodesCopied`, `iHaveSavedCodes`, `done`, `cancelSetup`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `package.json` – `@types/qrcode` přidán do devDependencies

**Dependency:**
- `npm install -D @types/qrcode` – TypeScript definice pro `qrcode` library

**Build:** `npm run build` – úspěšně, TypeScript OK, žádné diagnostics chyby

### Fix – Sloupec `avif_auto_download` v migraci 009 (DOKONČENO)
- `supabase/migrations/009_create_avatars_bucket.sql` – odstraněn sloupec `avif_auto_download` z INSERT statementu:
  - Free tier Supabase tento sloupec nemá → error `42703: column does not exist`
  - AVIF konverze není pro avatar bucket potřeba – stačí `id`, `name`, `public`

### Krok 74 – Supabase Storage Bucket pro Avatary (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/009_create_avatars_bucket.sql` – vytvoření storage bucketu `avatars`:
  - Public bucket pro profilové obrázky
  - RLS politiky:
    - Users can upload avatars (INSERT do vlastního folderu `user_id/`)
    - Anyone can view avatars (SELECT pro všechny)
    - Users can update their own avatars (UPDATE vlastních souborů)
    - Users can delete their own avatars (DELETE vlastních souborů)

### Krok 73 – Kompletní implementace Nastavení podle Buffer UX (DOKONČENO)

**Databázová migrace:**
- `supabase/migrations/008_add_profile_settings.sql` – nové sloupce v tabulce `users`:
  - `organization_name` TEXT – název organizace
  - `backup_email` TEXT – záložní email
  - `avatar_url` TEXT – URL profilového obrázku
  - `two_factor_enabled` BOOLEAN DEFAULT FALSE – stav 2FA
  - `two_factor_secret` TEXT – TOTP secret
  - `two_factor_recovery_codes` JSONB – recovery kódy

**Stránka Profil (`/settings/profile`):**
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – kompletně přepsaný Client Component:
  - **Foto profilu**: Upload do Supabase Storage (`avatars` bucket), preview, spinner při nahrávání
  - **Email**: Read-only s badge verifikace (již existovalo)
  - **Jméno**: Input pro jméno/příjmení s Save tlačítkem (již existovalo)
  - **Backup Email**: Nové pole pro záložní email s popisem
  - **Heslo**: Sekce pro změnu hesla s toggle form, show/hide password, validace (min 6 znaků)
  - **2FA**: Toggle pro dvoufázové ověřování, enable/disable formuláře, badge stavu
  - **Jazyk**: Selector + přepnutí locale (již existovalo)
  - **Danger Zone**: Smazání účtu s potvrzením ("DELETE"), červená karta
  - **Design**: Glassmorphism karty (20px radius), Buffer-style layout
  - **Toast feedback**: Green check po úspěšném uložení každé sekce
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – rozšířené Server Actions:
  - `updateFullName`, `updateLanguage` (již existovaly)
  - `updateBackupEmail` – update backup_email
  - `updatePassword` – Supabase auth.updateUser
  - `enable2FA`, `disable2FA` – toggle 2FA + secret
  - `deleteAccount` – smazání z users + signOut
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – update Server Component:
  - Fetchuje nová pole: `avatar_url`, `backup_email`, `two_factor_enabled`
  - Předává všechny labely z i18n

**Stránka Organizace/Obecné (`/settings/general`):**
- `src/app/[locale]/(dashboard)/settings/general/page.tsx` – Server Component:
  - **Creation Date**: Read-only datum vytvoření účtu (formátováno podle locale)
  - **Organization Name**: Input s Save tlačítkem
  - Fetchuje `organization_name`, `created_at` z DB
- `src/app/[locale]/(dashboard)/settings/general/general-form.tsx` – Client Component:
  - Dvě sekce v Buffer stylu (Creation Date, Organization Name)
  - State management pro organization name + save feedback
- `src/app/[locale]/(dashboard)/settings/general/actions.ts` – Server Action:
  - `updateOrganizationName` – update organization_name v DB

**i18n aktualizace:**
- `src/messages/cs.json` – nové klíče v `settings` namespace (38 nových klíčů):
  - `generalDescription`, `creationDate`, `organizationName`, `organizationNamePlaceholder`
  - `photo`, `uploadPhoto`, `photoDescription`, `uploading`
  - `backupEmail`, `backupEmailPlaceholder`, `backupEmailDescription`
  - `password`, `changePassword`, `newPassword`, `confirmPassword`
  - `twoFactorAuth`, `twoFactorAuthDescription`, `twoFactorEnabled`, `twoFactorDisabled`
  - `enable2FA`, `disable2FA`, `dangerZone`, `dangerZoneDesc`
  - `deleteAccount`, `confirmPasswordDelete`, `deleteAccountConfirm`, `deletingAccount`
  - `savedGeneral`, `errorSavingGeneral`, `savedBackupEmail`, `errorSavingBackupEmail`
  - `savedPassword`, `errorChangingPassword`, `twoFASuccess`, `twoFADisabled`
  - `errorEnabling2FA`, `errorDisabling2FA`, `photoUpdated`, `errorUploadingPhoto`
  - `accountDeleted`, `errorDeletingAccount`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- `src/messages/*.json` – `common.verificationCode` přidán do všech jazyků

### Fix – Whitespace v modálu "Vytvořit nový štítek" (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – vylepšení spacingu pro vzdušnost:
  - **DialogContent**: `p-6 sm:p-8` (menší padding na mobilu)
  - **DialogTitle**: `text-lg sm:text-xl` (responzivní velikost)
  - **DialogHeader**: `pb-3 sm:pb-4`
  - **Formulář**: `space-y-8 sm:space-y-10 pt-4 sm:pt-6` (responzivní mezery mezi sekcemi)
  - **Kořen problému**: `space-y-3` na wrapper `<div>` nefungoval správně – Radix Label má `leading-none` + inline display, což rozbíjelo margin kasládování. Řešení:
    - Odstraněno `space-y-3` z obou wrapper divů
    - Label: `block` display (překoná inline default z Radix)
    - Input: explicitní `mt-3` (12px margin-top přímo na inputu – spolehlivé)
    - Barvy: `mt-3` na kontejner koleček (stejný odstup jako u inputu – label "Barva štítku" na stejné výšce jako "Název štítku")
  - **Mobilní responzivita**: Všechny paddingy a spacingy mají `sm:` varianty

### Krok 72 – Nová stránka Štítky (Tags) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/labels/page.tsx` – Server Component stránka Štítky:
  - **Design**: 100% konzistentní s ostatními stránkami (templates pattern) – H1 + count + tlačítko Create
  - **Empty State**: Centrální obsah s fialovým glow (blur-3xl), Tag ikona (h-16 w-16), nadpis, podnadpis, popis + CTA tlačítko
  - **Seznam štítků**: Karty s barevným tečkovým indikátorem + název + hover delete button (opacity transition)
  - **Data**: Fetchuje `tags` z DB, ordered by `created_at DESC`
  - **Responzivita**: `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`, centrální empty state
- `src/app/[locale]/(dashboard)/settings/labels/create-tag-dialog.tsx` – Client Component modální dialog:
  - **Formulář**: Input pro název štítku + výběr barvy (10 barevných koleček)
  - **Barvy**: Indigo, Purple, Pink, Red, Orange, Amber, Emerald, Teal, Cyan, Blue
  - **Výběr barvy**: Rounded-full buttons s ring indikátorem + check ikona na vybranou barvu
  - **Validace**: Submit disabled pokud je prázdný název nebo běží create
  - **Dialog**: shadcn/ui Dialog s glassmorphism stylem (rounded-[20px], backdrop-blur-xl)
- `src/app/[locale]/(dashboard)/settings/labels/tag-item.tsx` – Client Component karta štítku:
  - **Vizuál**: Barevná tečka + název + delete button (opacity-0 → group-hover:opacity-100)
  - **Delete**: Confirm dialog před smazáním → Server Action `deleteTag`
- `src/app/[locale]/(dashboard)/settings/labels/actions.ts` – Server Actions:
  - `createTag(name, color)`: INSERT do `tags` tabulky s `user_id`, revalidace `/settings`
  - `deleteTag(id)`: DELETE z `tags` tabulky s RLS kontrolou `user_id`, revalidace `/settings`
- `supabase/migrations/007_create_tags_table.sql` – SQL migrace:
  - `CREATE TABLE tags` (id UUID, user_id UUID FK → users, name TEXT, color TEXT, created_at, updated_at)
  - `INDEX idx_tags_user_id` pro rychlé dotazy
  - RLS politiky: SELECT/INSERT/UPDATE/DELETE pouze pro vlastníka (`auth.uid() = user_id`)
- `src/messages/cs.json` – nový namespace `tags` (22 klíčů):
  - title, emptyTitle, emptySubtitle, emptyDescription, createTag, modalTitle
  - nameLabel, namePlaceholder, colorLabel, cancel, create
  - tagCreated, tagDeleted, errorCreating, errorDeleting, deleteConfirm, deleteTag
  - usedInPosts, usedInPostsZero
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/labels` již existuje v sidebar dropdown menu (Tag ikona, sekce "Funkce")
- **Build**: `npm run build` – úspěšně, TypeScript OK, nová route `/[locale]/settings/labels` registrována

### Krok 71 – Nová stránka Nastavení / Předvolby (Settings/Preferences) (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/preferences/page.tsx` – Server Component stránka Předvolby:
  - **Design**: Stejný styl jako Profil/Fakturace – hlavička H1 + popis, responzivní font (`text-xl sm:text-2xl md:text-3xl`)
  - **Data**: Fetchuje `timezone`, `time_format`, `start_of_week`, `default_posting_time` z tabulky `users`
  - **Default values**: Europe/Prague, 24h, monday, 09:00 (pokud DB vrací null)
  - **Labels**: Předává přeložené stringy z i18n do Client Componentu (pattern jako ProfileForm)
- `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx` – Client Component formulář:
  - **4 sekce** (vzor Buffer): Timezone, Time Format, Start of Week, Default Posting Action
  - **Timezone**: Select box s 42 časovými pásmi (Evropa, Amerika, Asie, Austrálie, Afrika)
  - **Time Format**: Radio card selection (12h / 24h) s preview času + indigo glow na aktivní volbě
  - **Start of Week**: Select box (Neděle / Pondělí)
  - **Default Posting Action**: Native time picker input
  - **Ikony**: Globe (indigo), Clock (purple), CalendarIcon (emerald), Clock (amber) – barevné ikony v rounded-xl boxech
  - **Ukládání**: Jedno tlačítko Save na konci → Server Action `updatePreferences`
  - **Saved feedback**: Check ikona + "Předvolby uloženy!" (auto-hide po 3s)
  - **Responzivita**: `p-4 sm:p-6`, `text-base sm:text-lg`, selecty `w-full sm:w-80` (fixed šířka na desktopu)
  - **Glassmorphism karty**: `rounded-[20px]`, `bg-white/70 dark:bg-card/40`, `backdrop-blur-md`, border + shadow
- `src/app/[locale]/(dashboard)/settings/preferences/actions.ts` – Server Action:
  - `updatePreferences(formData)`: Update `timezone`, `time_format`, `start_of_week`, `default_posting_time` v `users` tabulce
  - `revalidatePath("/settings")` po úspěchu
- `supabase/migrations/006_add_user_preferences.sql` – SQL migrace:
  - `ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Europe/Prague'`
  - `ADD COLUMN time_format TEXT DEFAULT '24' CHECK (IN '12','24')`
  - `ADD COLUMN start_of_week TEXT DEFAULT 'monday' CHECK (IN 'sunday','monday')`
  - `ADD COLUMN default_posting_time TEXT DEFAULT '09:00'`
- `src/messages/cs.json` – nové i18n klíče (settings namespace):
  - preferencesDescription, timezone, timezoneDescription, timeFormat, timeFormatDescription
  - timeFormat12, timeFormat24, startOfWEEK, startOfWEEKDescription
  - defaultPostingAction, defaultPostingActionDescription, defaultTime
  - savedPreferences, errorSaving, sunday, monday
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Navigace**: Odkaz na `/settings/preferences` již existuje v sidebar dropdown menu (SlidersHorizontal ikona)

### Fix – Sidebar Upgrade Button: Odkaz na Billing stránku (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – tlačítko Upgrade v dolní části sidebaru:
  - **Nové**: `asChild` prop na Button + `<Link href={`/${locale}/settings/billing`}>`
  - **Předtím**: Tlačítko bylo jen `<Button>` bez jakékoli funkčnosti
  - **Nyní**: Kliknutí přesměruje na `/settings/billing` (stránka s přehledem plánů)

### Fix – Billing Page: Server → Client Serialization Errors (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – oprava serializace props:
  - **Odstraněno**: `icon` property z plans array (React komponenty nelze serializovat)
  - **Odstraněno**: `t={t as any}` (funkce nelze serializovat z Server do Client Component)
  - **Nové**: `translations` objekt s přeloženými stringy (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Odstraněno**: Importy `Check`, `Crown`, `Sparkles`, `Zap` z lucide-react
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – ikony a překlady na klientské straně:
  - **Nové**: `iconMap` – mapuje `plan.id` → ikonu (`free: Sparkles`, `creator: Zap`, `pro: Crown`)
  - **Nové**: Importy `Crown`, `Sparkles`, `Zap` z lucide-react (v client componentu)
  - **Odstraněno**: `icon: React.ElementType` z Plan interface
  - **Odstraněno**: `locale` a `t: any` z BillingCardProps
  - **Nové**: `translations` interface (`current`, `perMonth`, `subscribe`, `upgrade`)
  - **Všechna `t("key")`** → `translations.key` (6 míst)
- **Příčina chyby**: Next.js nedovolí předávat funkce ani React komponenty z Server Component do Client Component – lze pouze plain objekty (stringy, čísla, booly, pole)
- Build: úspěšný, žádné TypeScript chyby

### Krok 70 – Konzistence, Live Data a Fix Mobilního Menu (DOKONČENO)
- `src/components/dashboard/mobile-nav.tsx` – fix barev DropdownMenuContent pro Light/Dark mode:
  - **Light mode**: `bg-white/90`, `text-slate-900`, ikony `text-slate-600`, `border-black/5`
  - **Dark mode**: `bg-black/90`, `text-white`, ikony `text-white/70`, `border-white/10`
  - **Backdrop**: `backdrop-blur-xl` + adaptivní stíny
  - **Nový nav item**: Inbox s ikonou MessageSquare + "NEW" badge (premium variant)
  - **Badge import**: `{ Badge } from "@/components/ui/badge"` pro inline "NEW" na mobilu
- `src/components/ui/badge.tsx` – nová varianta "premium":
  - **Design**: Capsule, glassmorphism, indigo text, jemný border
  - **Styl**: `bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 backdrop-blur-sm shadow-sm`
- `src/app/[locale]/(dashboard)/page.tsx` – živá data z Supabase:
  - **Celkem příspěvků**: `COUNT(*)` z `posts`
  - **Naplánované**: `COUNT(*) WHERE status = 'scheduled'` (reálné číslo místo 0)
  - **Propojené účty**: `COUNT(*)` z `social_accounts` (už fungovalo)
  - **Denní série**: `streak` z `users` tabulky
  - **Flame ikona**: Když `streak > 0`, ikona svítí oranžově (`text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]`)
  - **Consistency Score**: Nová karta s kruhovým progress barem (SVG circle + gradient indigo→purple) – mockup 89%
  - **Icon change**: Streak ikona Copy → Flame, Scheduled ikona FileText → Calendar
- `src/components/dashboard/sidebar.tsx` – Inbox nav item + Badge podpora:
  - **ICON_MAP**: Přidáno `inbox: MessageSquare`
  - **NavItem interface**: Nový optional prop `badge?: string`
  - **Render**: Badge variant="premium" se zobrazí vedle labelu pokud `item.badge` existuje
  - **Import**: `MessageSquare` z lucide-react, `Badge` z ui
- `src/app/[locale]/(dashboard)/inbox/page.tsx` – prázdná stránka Community Inbox:
  - **Design**: Glassmorphism karta s MessageSquare ikonou + placeholder text
  - **i18n**: Název z `nav.inbox`
- `src/app/[locale]/(dashboard)/layout.tsx` – Inbox v navItems:
  - Nový item: `{ href: "/inbox", label: navT("inbox"), icon: "inbox", badge: "NEW" }`
  - Pozice: mezi Kalendář a Účty
- `src/messages/cs.json` – nové klíče:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Skóre konzistence"
- `src/messages/en.json` – totéž v angličtině:
  - `nav.inbox` = "Inbox"
  - `dashboard.consistencyScore` = "Consistency Score"
- `src/messages/uk.json` – totéž v ukrajinštině:
  - `nav.inbox` = "Вхідні"
  - `dashboard.consistencyScore` = "Бал консистентності"
- Build: úspěšný, žádné TypeScript chyby

### Krok 23 – Gamifikace a Redesign Fakturace (DOKONČENO)
- `src/components/dashboard/setup-guide.tsx` – nová komponenta "Dokončete nastavení":
  - **Design**: Skleněná karta (`bg-card/40 backdrop-blur-xl border-white/10 rounded-[24px]`) plavoucí v pravém dolním rohu
  - **Progress bar**: Gradient (indigo→purple) s animací Framer Motion, zobrazuje {completed}/{total} %
  - **Seznam úkolů**: 4 kroky s checkmarky – Vytvořit účet (vždy hotovo), Propojit první síť, Uložit první nápad, Naplánovat první post
  - **Logika**: Widget se zobrazí pouze pokud nejsou všechny kroky hotové; po dokončení zmizí
  - **Data**: Reálná data z DB (social_accounts count, posts count) – Supabase queries při mountu
  - **Dismiss**: X tlačítko pro zavření (state `dismissed`)
  - **Responzivita**: `bottom-20 right-4` na mobilu (nad bottom nav), `bottom-6 right-6` na desktopu
- `src/app/[locale]/(dashboard)/settings/billing/page.tsx` – nová stránka fakturace:
  - **3 srovnatelné karty**: Free, Creator, Pro – přesně podle vzoru Buffer
  - **Styl karet**: `bg-card/40 backdrop-blur-xl border-white/5 rounded-[24px] p-8`
  - **Header karet**: Ikona (Sparkles/Zap/Crown) + název + popis + cena
  - **Ceny**: Free (zdarma), Creator (199 Kč/8 EUR/9 USD), Pro (499 Kč/20 EUR/22 EUR)
  - **Features list**: Checkmarky s hodnotami (účty, příspěvky/měsíc, šablony, analytika)
  - **Current Plan**: Badge "Aktuální" (emerald) na aktuálním tarifu
  - **Recommended**: Badge + indigo glow na Creator plánu
  - **CTA tlačítka**: "Upgrade" / "Odebírat" / "Aktuální" (disabled)
- `src/app/[locale]/(dashboard)/settings/billing/billing-card.tsx` – Client Component pro billing karty:
  - **Icon box**: Barevný (indigo) pro recommended, šedý pro ostatní
  - **Display price**: EUR jako primární měna (`{price}€`) + `/měsíc`
  - **Feature items**: Emerald checkmark + label + value
  - **Button varianty**: Default (indigo) pro recommended, outline pro ostatní
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace SetupGuide:
  - Import `SetupGuide` komponenty
  - Render `<SetupGuide locale={locale} />` v layoutu před MobileNav
  - Widget je fixed positioned – neovlivňuje layout
- `src/components/dashboard/mobile-nav.tsx` – optimalizace pro 6 ikon:
  - **Výška**: `h-[64px]` → `h-[56px]` (o 8px nižší)
  - **Distribuce**: `justify-around` → `justify-evenly` (rovnoměrné rozložení)
  - **Padding**: `px-4` → `px-1` (menší okraje)
  - **Ikony**: `w-6 h-6` → `w-5 h-5` (o 1px menší)
  - **Text**: `text-[10px]` → `text-[9px]`, `mt-1` → `mt-0.5`
  - **Active dot**: `bottom-1` → `bottom-0.5` (přiblížen k okraji)
  - **Výsledek**: 6 ikon (Přehled, Příspěvky, Kalendář, Účty, Analytika, Nastavení) se vejdou přirozeně
- `src/messages/cs.json` – nové i18n sekce:
  - `setup`: title, progress, createAccount, connectFirstNetwork, saveFirstIdea, scheduleFirstPost
  - `billing`: title, subtitle, currentPlan, free, creator, pro, perMonth, accounts, postsPerMonth, templates, analytics, support, unlimited, basic, advanced, priority, current, upgrade, downgrade, subscribe
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 68 – Refaktorování nastavení: Dropdown menu + odstranění vnitřního sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – Account Switcher přetvořen na DropdownMenu:
  - **Původní stav**: Statická karta s profilem + tlačítko Settings (redirect) + Upgrade
  - **Nový stav**: Celá karta je kliknutelný DropdownMenuTrigger
  - **DropdownMenuContent** (side="top", Premium Glass design):
    - Sekce ÚČET: Profil (User), Předvolby (SlidersHorizontal), Notifikace (Bell)
    - Sekce ORGANIZACE: Obecné (Building2), Fakturace (CreditCard)
    - Sekce FUNKCE: Štítky (Tag)
    - Separator + LogoutButton (LogOut)
  - **Design**: `backdrop-blur-xl`, `rounded-[20px]`, `bg-white/90 dark:bg-black/90`, shadow
  - **Nový prop**: `settingsLabels` (profile, preferences, notifications, general, billing, labels, accountLabel, organizationLabel, featuresLabel)
  - **Odstraněno**: Settings ikona jako samostatné tlačítko, Settings z ICON_MAP
- `src/app/[locale]/(dashboard)/layout.tsx` – předávání `settingsLabels` do Sidebar + MobileNav:
  - `settingsLabels` objekt z `settingsT` (getTranslations)
  - Sidebar i MobileNav dostávají stejné labels pro konzistenci
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – odstranění vnitřního sidebaru:
  - **Původní stav**: Flex layout s `SettingsSidebar` (w-56) + children ve flex-1
  - **Nový stav**: Jednoduchý kontejner `mx-auto w-full max-w-4xl` – obsah přes celou šířku, centrován
  - **Odstraněno**: Import `SettingsSidebar`, `getTranslations`, `params` prop
  - **Výsledek**: Nastavení bez vnořeného menu – navigace přes dropdown v sidebaru
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – mobilní responzivita:
  - **Karty**: `p-4 sm:p-6` (menší padding na mobilu)
  - **Hlavičky**: `text-base sm:text-lg` (menší font na mobilu)
  - **Spacing**: `mb-3 sm:mb-4` na labelích
  - **Email input**: `px-3 sm:px-4` + `truncate` pro dlouhé e-maily
  - **Badges**: `flex-shrink-0` aby se nemačkaly
  - **Tlačítka**: `flex-wrap` na Language buttons aby nepřetekly
  - **Container spacing**: `space-y-4 sm:space-y-6`
- `src/app/[locale]\(dashboard)\settings\profile\page.tsx` – responzivní hlavička:
  - **H1**: `text-xl font-bold sm:text-2xl md:text-3xl` (stupňovitý font)
  - **Spacing**: `space-y-4 sm:space-y-6`
- `src/components/dashboard/mobile-nav.tsx` – tlačítko Nastavení s DropdownMenu:
  - **Nový nav item**: Settings ikona jako 6th item v bottom bar
  - **DropdownMenu** (side="top", Premium Glass): Stejné sekce jako desktop sidebar
    - ÚČET: Profil, Předvolby, Notifikace
    - ORGANIZACE: Obecné, Fakturace
    - FUNKCE: Štítky
    - Logout (handleLogout přes Supabase client)
  - **Nový prop**: `settingsLabels` (stejný interface jako Sidebar)
  - **Active state**: `isSettingsPage` detekce + indigo glow + tečka
  - **Logout**: Inline `handleLogout` (createClient → signOut → redirect na login)
  - **Design**: `bg-black/90 backdrop-blur-xl` (vždy dark na mobilu)
- `src/components/settings/settings-sidebar.tsx` – komponenta již nepoužívána (zůstává v repo, nic nelomčí)
- Build: úspěšný, žádné TypeScript chyby

### Krok 67 – Oprava useFormState → useActionState (DOKONČENO)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – migrace na React 19 API:
  - **Příčina**: `ReactDOM.useFormState` byl přejmenován na `React.useActionState` v Next.js 16
  - **Řešení**: Import změněn z `react-dom` → `react`, obě volání `useFormState(...)` → `useActionState(...)`
- Build: úspěšný, žádné chyby

### Krok 66 – Oprava dvou chyb: script tag v layout + translateFn v Client Component (DOKONČENO)
- `src/app/layout.tsx` – oprava Console Error "Encountered a script tag while rendering React component":
  - **Příčina**: `<script>` tag v `<head>` není v Next.js App Router podporován – scripty v React componentech se nikdy neexecutují při client-side rendering
  - **Řešení**: `<script id="theme-init">` přesunuto z `<head>` přímo do `<body>` – theme initialization script běží před hydratací
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – oprava Runtime Error "Functions cannot be passed directly to Client Components":
  - **Příčina**: `authT` a `settingsT` byly funkce z `getTranslations()` předávané přímo do Client Component `ProfileForm` – funkce z Server Components nelze předat bez `"use server"`
  - **Řešení**: Místo funkcí se předávají již vyřešené stringy přes `labels` object (`{ email, emailVerified, emailNotVerifiedBadge, fullName, language, saved }`)
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – přepsání interface + implementace:
  - **Nový interface**: `ProfileFormLabels` (stringy) místo `settingsT: any, authT: any` (funkce)
  - **Všechna volání**: `authT("email")` → `labels.email`, `settingsT("fullName")` → `labels.fullName`, atd.
- Build: úspěšný, žádné chyby

### Krok 21 – Úprava hlavní navigace + Sjednocení nastavení (DOKONČENO)
- `src/app/[locale]/(dashboard)/layout.tsx` – nová navigace:
  - **navItems pořadí**: Přehled → Příspěvky → Kalendář → Účty → Analytika
  - **Nastavení odstraněno** z hlavního menu – dostupné jen přes profil/kolečko dole
  - **full_name z DB**: `userFullName` se fetchuje z tabulky `users` (`select("onboarded, full_name")`) a předává se do Sidebar
  - **Sidebar user.name**: Nyní zobrazuje `full_name` z DB místo `user_metadata`
- `src/components/dashboard/sidebar.tsx` – Account Switcher (spodní karta):
  - Zobrazuje `user?.name` (full_name z DB) || "Uživatel"
  - E-mail zůstává pod jménem jako secondary info
  - Settings ikona → redirect na `/${locale}/settings`
- `src/components/dashboard/mobile-nav.tsx` – mobilní navigace:
  - Odstraněno "Nastavení" z bottom bar
  - Přidáno "Účty" (LinkIcon) – stejné pořadí jako desktop
- `src/app/[locale]/(dashboard)/settings/layout.tsx` – Buffer-style settings layout:
  - **Vnitřní sidebar (podmenu)**: 3 sekce – Účet (Profil, Předvolby, Notifikace), Organizace (Obecné, Fakturace), Funkce (Štítky)
  - **Design**: Skleněný efekt (`bg-white/70 dark:bg-card/40 backdrop-blur-md`), `rounded-[20px]`, border
  - **Aktivní položka**: Indigo podsvícení + tečka vpravo (`bg-primary shadow-[0_0_8px]`)
- `src/components/settings/settings-sidebar.tsx` – nová komponenta:
  - Sekční hlavičky z i18n (`accountLabel`, `organizationLabel`, `featuresLabel`)
  - Ikony: User, SlidersHorizontal, Bell, Building2, CreditCard, Tag (lucide-react)
  - Aktivní stav: `bg-indigo-50 text-indigo-700` (light) / `dark:bg-white/[0.05] dark:border-white/10` (dark)
- `src/app/[locale]/(dashboard)/settings/profile/page.tsx` – server component:
  - Fetchuje `full_name` + `language` z `users` tabulky
  - Renderuje `ProfileForm` s inicializovanými hodnotami
- `src/app/[locale]/(dashboard)/settings/profile/profile-form.tsx` – client component:
  - **Formulář jména**: Input + Button → Server Action `updateFullName`
  - **Formulář jazyka**: Select + Button → Server Action `updateLanguage` + "Přepnout" tlačítko
  - **Email display**: Read-only + verification badge (CheckCircle2/AlertCircle)
  - **Design**: Glassmorphism karty (`rounded-[20px]`, `bg-white/70 dark:bg-card/40`)
- `src/app/[locale]/(dashboard)/settings/profile/actions.ts` – Server Actions:
  - `updateFullName(formData)`: Update `full_name` v `users` tabulce → `revalidatePath("/settings")`
  - `updateLanguage(formData)`: Update `language` v `users` tabulce → `revalidatePath("/settings")`
  - Validace: auth check, error handling s `useFormState`
- `src/app/[locale]/(dashboard)/settings/page.tsx` – redirect na `/settings/profile`
- `src/messages/cs.json` – nové klíče v `settings`:
  - `profileDescription`, `preferences`, `notifications`, `general`, `billing`, `labels`
  - `accountLabel`, `organizationLabel`, `featuresLabel`
  - `common.switch` = "Přepnout"
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Databáze**: Žádná migrace potřeba – `full_name` již existuje v tabulce `users` (001_initial_schema.sql)
- Build: úspěšný, žádné TypeScript chyby

### Krok 65 – Buffer-style Account Type Selection Modal (DOKONČENO)
- `src/components/account-type-modal.tsx` – nová komponenta pro výběr typu účtu (Buffer-style flow):
  - **Design**: Dialog s dvěma sloupci vedle sebe – Professional vs Personal
  - **Professional sloupec**: Zelený badge "Automatické odesílání & Notifikace", 3 funkce s ikonymi (Check, Users, BarChart3), indigo/purple gradient tlačítko
  - **Personal sloupec**: Šedý badge "Pouze přes notifikace", 1 funkce (Bell ikona), outline/ghost tlačítko
  - **Styl**: Premium Glass (backdrop-blur-xl, border-white/10, rounded-[20px]), glow efekt na Professional sloupci při hoveru
  - **i18n**: Všechny texty přes `t` props – subtitle, badge, titles, descriptions, buttons
  - **Platforma**: PlatformIcon + platformName v headeru modálu
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – integrace AccountTypeModal:
  - **Nové stavy**: `showTypeModal`, `typeModalPlatform` (id, name, icon)
  - **Klik na Instagram**: Otevírá AccountTypeModal místo přímého formuláře
  - **Klik na ostatní platformy**: Zůstává původní chování (přímý formulář s inputy)
  - **onProfessional + onPersonal**: Zatím obě vedou na stejný formulář (příprava pro OAuth v budoucnu)
- `src/messages/cs.json` – nové klíče v `accounts`: `howToConnect`, `professional`, `professionalDesc`, `personal`, `personalDesc`, `autoPostingBadge`, `notificationsBadge`, `autoPublishing`, `autoPublishingDesc`, `communityReplies`, `communityRepliesDesc`, `postMetrics`, `postMetricsDesc`, `onlyNotifications`, `onlyNotificationsDesc`, `connectProfessional`, `setupPersonal`, `selectTypeSubtitle`
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- Build: úspěšný, žádné TypeScript chyby

### Krok 64 – LocaleSwitcher Fix + Premium Light Login Page Redesign (DOKONČENO)
- `src/components/locale-switcher.tsx` – oprava "login" textu v LocaleSwitcheru:
  - **Příčina**: `usePathname()` vrací `/login` bez locale prefixu v některých případech → `split("/")[1]` vrátilo `"login"` → fallback byl `"login"` místo názvu jazyka
  - **Řešení**: `pathname.split("/").filter(Boolean)` + validace proti seznamu locale kódů – `locales.find((l) => l.code === parts[0])?.code || "cs"`
  - **Fallback**: `"cs"` (Čeština) místo `currentLocale` (který mohl být `"login"`)
  - **Accessibility**: `aria-label={currentLabel}` na Buttonu pro screen readery
  - **Vizuál**: `text-muted-foreground` na labelu jazyka pro jemnější vzhled
- `src/app/[locale]/(auth)/login/page.tsx` – Premium Light redesign:
  - **Pozadí stránky**: `bg-slate-50 dark:bg-black` – jemná šedobílá ve světlém režimu
  - **Grid pattern**: SVG grid s `bg-slate-200/50` v light modu – viditelnější mřížka
  - **Formulářová karta**: `bg-white/60 backdrop-blur-xl border border-white shadow-xl rounded-[32px] p-10` – bílá glass karta s hloubkou
  - **Dark mode**: Karta je transparentní (`dark:bg-transparent dark:shadow-none dark:rounded-none`) – žádná změna dark vizuálu
- `src/components/auth/email-signin.tsx` – Light/Dark adaptivní inputy:
  - **Divider linky**: `bg-slate-200 dark:bg-white/10` – viditelné v obou režimech
  - **Inputy**: `bg-white/80 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-900 dark:text-foreground`
  - **Focus**: `focus:border-indigo-500 dark:focus:border-indigo-500/50` – plně indigo v light, jemnější v dark
  - **Submit tlačítko**: `bg-indigo-500 dark:bg-white text-white dark:text-black hover:bg-indigo-600 dark:hover:bg-white/90` – barevné v light, bílé v dark
- `src/components/auth/login-visual.tsx` – Dashboard mock Light/Dark redesign:
  - **Grid pattern**: `opacity-[0.06] dark:opacity-[0.04]` – viditelnější v light modu, gray stroke (`#a0a0a0`)
  - **Glow efekty**: `bg-purple-200/40 dark:bg-purple-500/20` a `bg-indigo-200/40 dark:bg-indigo-500/15` – silnější záře v light
  - **Hlavní záře**: `from-indigo-200/40 via-purple-200/30 to-blue-200/20 dark:from-purple-500/30 dark:via-indigo-500/20 dark:to-blue-500/10` – indigo glow v light, purple v dark
  - **Dashboard karta**: `border-white/50 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md dark:backdrop-blur-xl shadow-lg dark:shadow-none`
  - **Texty v kartě**: `text-slate-900 dark:text-white` a `text-slate-500 dark:text-white/60` – černé v light, bílé v dark
  - **Graf bary**: Střídavé `bg-slate-200/80 dark:bg-white/25` a `bg-indigo-400/60 dark:bg-white/25` – slate/indigo v light, bílé v dark
  - **Metriky karty**: `bg-white/50 dark:bg-white/10` – silnější v light
  - **Floating karty**: `border-white/60 dark:border-white/20 bg-white/50 dark:bg-white/5 shadow-md dark:shadow-none`
  - **Ikony**: `text-emerald-500 dark:text-emerald-300` a `text-amber-500 dark:text-amber-300` – sytější v light
- Build: úspěšný, žádné TypeScript chyby

### Krok 63 – Light Mode: "Milky Glass" Design Overhaul (DOKONČENO)
- `src/components/ui/dialog.tsx` – Milky Glass modal:
  - **Overlay**: `bg-black/20 dark:bg-black/60` – tmavší overlay pro lepší fokus na modal
  - **DialogContent**: `bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – mléčné sklo ve světlém režimu
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín light, výrazný dark
  - **Text**: `text-slate-900 dark:text-white` – plná černá v light modu
  - **Radius**: `rounded-[20px]` – konzistentní s design systémem
- `src/components/edit-post-dialog.tsx` – Milky Glass edit modal:
  - **DialogContent**: `bg-white/80 dark:bg-card/40` + shadow + border pro Milky Glass
  - **Textarea**: `text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus:bg-white focus:border-indigo-500/30` – plná černá barva textu, jemné bordery
  - **Inputy (location, tags)**: totéž – `bg-white/50` → `focus:bg-white`, `border-black/5` → `focus:border-indigo-500/30`
  - **Platformy**: Přirozené barvy ikon ve světlém režimu (Instagram #E1306C, Facebook #1877F2, Twitter #1DA1F2, LinkedIn #0A66C2, YouTube #FF0000, TikTok #010101)
  - **Platform pill**: `bg-white/60 dark:bg-white/[0.03] text-slate-700` – ne šedé mrtvé, ale živé s barevnými ikonami
  - **Platform pill selected**: `bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300`
- `src/components/ui/date-time-picker.tsx` – Kalendář NAKONEC bílý v light modu:
  - **Trigger button**: `bg-white/50 dark:bg-white/[0.03] border-black/5 dark:border-white/10`
  - **Kalendář kontejner**: `bg-white/95 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10` – BÍLÝ pozadí v light modu!
  - **Text**: `text-slate-900 dark:text-white` na celém kontejneru
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl`
  - **Navigace měsíce**: hover `bg-black/5 dark:bg-white/10`
  - **Dny v kalendáři**: hover `bg-black/5 dark:bg-white/10`, today `text-indigo-600 dark:text-indigo-300`
  - **Vybraný den**: indigo gradient + `text-white` (nezměněno)
  - **Divider**: `bg-black/5 dark:bg-white/5`
  - **TimeSelect trigger**: `bg-white/60 dark:bg-[#09090b] border-black/5 dark:border-white/10`
  - **TimeSelect dropdown**: `bg-white/95 dark:bg-[#0b0b0b]` – BÍLÝ v light modu!
  - **TimeSelect položky**: hover `bg-black/5 dark:bg-white/[0.06]`, selected `bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400`
- `src/app/globals.css` – Grid + Glass vylepšení:
  - **Grid pattern light**: `stroke='%23a0a0a0'` (jemně šedá místo černé), `opacity: 0.05` (z 0.03)
  - **Glass card light**: `rgba(255,255,255,0.8)` (z 0.7), `blur(16px)` (z 12px), `border rgba(0,0,0,0.05)` (z 0.08)
  - **Glass modal light**: `rgba(255,255,255,0.9)` (z 0.85), `border rgba(0,0,0,0.05)` (z 0.08)
- Build: úspěšný, žádné TypeScript chyby

### Krok 62 – Time Picker: Custom dropdowny pro HH/MM (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – oprava vizuální chyby v dark modu:
  - **Nová komponenta `TimeSelect`**: Radix Popover based dropdown – plně stylovatelná alternativa k nativnímu `<select>`
  - **Trigger button**: `bg-black/80 dark:bg-[#09090b]` pozadí, `border-white/10`, `rounded-lg`, `text-foreground` – ladí s tmavým pozadím
  - **Popover seznam**: `bg-black/80 dark:bg-[#0b0b0b]` + `backdrop-blur-xl` + `shadow-2xl` – tmavý skleněný dropdown
  - **Aktivní hodnota**: `bg-indigo-600/20 text-indigo-400 font-medium` – indigo highlight vybrané položky
  - **Hover**: `hover:bg-white/[0.06]` – jemný hover efekt na položkách
  - **Scroll**: `max-h-52 overflow-y-auto` + auto-scroll na vybranou položku při otevření
  - **Labels HH/MM**: `text-muted-foreground/50` (z /40) – jemně šedé, nepřebíjejí čísla
  - **z-index**: `z-[60]` pro time dropdowns – nad hlavním popoverem kalendáře (`z-50`)
  - **Příčina problému**: Nativní `<select>` elementy renderují `<option>` v nativním browseru – Tailwind třídy se na dropdown menu vztahují jen částečně, což vedlo k bílému pozadí v dark modu
- Build: úspěšný, žádné TypeScript chyby

### Krok 15.3 – Bezpečnostní limity pro média (DOKONČENO)
- `src/hooks/use-media-upload.ts` – striktní limity velikosti souborů:
  - **Obrázky**: max 5 MB (dříve 50 MB)
  - **Videa**: max 20 MB (dříve 50 MB)
  - **Konstanty**: `MAX_IMAGE_SIZE = 5MB`, `MAX_VIDEO_SIZE = 20MB`
  - **Validace typů**: Rozlišené pole extenzí `ALLOWED_IMAGE_EXTENSIONS` (jpg, jpeg, png, webp, gif, svg) a `ALLOWED_VIDEO_EXTENSIONS` (mp4, mov)
  - **MIME typy**: `ALLOWED_IMAGE_MIMES` (jpeg, png, webp, gif, svg+xml) a `ALLOWED_VIDEO_MIMES` (mp4, quicktime)
  - **Funkce**: `getFileKind()` (detekce typu souboru), `getFileSizeLimit()` (limit podle typu), `isFileTooLarge()` (kontrola velikosti)
  - **Validace před uploadem**: `addFiles()` kontroluje velikost před přidáním do queue – oversized soubory se zahodí + toast error
  - **Toast messages**: Rozlišené pro obrázky (`fileTooLargeImage`) a videa (`fileTooLargeVideo`)
  - **Upload flow**: Client-side (browser → Supabase Storage) přes `createBrowserClient` z `@supabase/ssr` – žádné Vercel serverless funkce se nezatěžují
- `src/messages/cs.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích: calendar + posts)
- `src/messages/en.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/messages/uk.json` – nové labely: `fileTooLargeImage`, `fileTooLargeVideo` (v obou sekcích)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- `src/components/edit-post-dialog.tsx` – `uploadLabels` rozšířen o `fileTooLargeImage`, `fileTooLargeVideo`
- **Bezpečnost**: Uživatelé již nemohou vyčerpat Supabase Storage velkými soubory. Limit 5MB pro fotky a 20MB pro videa je dostatečný pro free tier.

### Krok 61 – Light/Dark Mode: Dokončení vyladění světlého režimu (DOKONČENO)
- `src/app/globals.css` – oprava invalidní CSS syntaxe:
  - `.calendar-day-hover` mělo `hover: {}` (není validní CSS, to je SCSS/Tailwind @layer syntax)
  - Nahrazeno za `&:hover` (nesting syntax podporovaná v Tailwind CSS v @layer utilities)
  - Komentář rozšířen: "light: subtle gray, dark: subtle white"
- **Ověření stavu předchozí relace** (krok 60 a dále):
  - Grid patterny ve 4 dashboard stránkách (`posts/[id]`, `posts/new`, `accounts`, `templates/new`) – už mají obě varianty (black stroke pro light, white stroke pro dark) ✅
  - Dashboard layout `layout.tsx` – grid pattern v `<main>` už má `#80808008` (light) / `#ffffff08` (dark) ✅
  - Cookie consent – kategorie mají `bg-gray-50 dark:bg-white/5` a `border-gray-200 dark:border-white/10` ✅
  - Sidebar – aktivní item `bg-indigo-50 dark:bg-white/[0.05]`, user card `bg-gray-50 dark:bg-accent/50` ✅
  - Kalendář – mřížka, buňky, hover efekty, filtry, modal – vše s light/dark variantami ✅
  - Post card – `bg-white/80 dark:bg-card/40`, border, shadow – adaptivní ✅
  - Login visual – grid pattern s `opacity-[0.03] dark:opacity-[0.04]` ✅
  - LocaleSwitcher – žádná specifická barevná úprava potřeba, používá Tailwind tokens ✅
- Build: úspěšný, žádné TypeScript chyby

### Krok 60 – Kalendář: Hover Preview Pozice + Light/Dark Mode + Cookie Consent (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy hover náhledu v kalendáři:
  - **Pozice náhledu relativní k příspěvku**: `handlePostHover` nyní používá `getBoundingClientRect()` pro získání pozice karty příspěvku a umísťuje náhled ~12px vedle ní (vpravo) nebo nad/pod ni podle dostupného místa
  - **Smart positioning**: Pokud náhled přesahuje pravý okraj viewportu, přesune se vlevo od karty. Pokud není místo ani vlevo, zobrazí se centrováno pod kartou
  - **Adaptivní design (Light/Dark mode)**: Karta náhledu nyní používá `bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny pro hloubku**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` – jemný stín v light modu, výraznější v dark modu
  - **Texty adaptivní**: `text-foreground/80` (černé v light, bílé v dark), `border-t border-black/5 dark:border-white/10`
  - **Media placeholder**: `bg-black/5 dark:bg-white/5` pro loading stav obrázků
- `src/components/cookie-consent.tsx` – adaptivní light/dark mode pro Cookie Consent:
  - **Floating card**: `bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-black/5 dark:border-white/10`
  - **Stíny**: `shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`
  - **Link barva**: `text-foreground` místo `text-white` (aby byl v light modu černý)
  - **Preferences Dialog**: `bg-white/90 dark:bg-black/60 backdrop-blur-2xl border-black/5 dark:border-white/10`
  - **Cookie category cards**: `border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
  - Všechny 4 kategorie (Necessary, Functional, Analytics, Advertising) mají adaptivní styl
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-06 (předchozí záznamy)

### Krok 15.2 – Logika nahrávání médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – kompletní vylepšení hook pro nahrávání médií:
  - **i18n podpora**: Hook nyní přijímá `labels` (MediaUploadLabels) pro toast messages – žádné hardcoded texty
  - **Validace formátů**: Nová funkce `isValidMediaFile` kontroluje povolené formáty (jpg, jpeg, png, webp, mp4, mov) + MIME typy
  - **ALLOWED_EXTENSIONS**: `[".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"]`
  - **Toast messages**: `tooManyFiles`, `uploadSuccess`, `uploadError`, `fileDeleted`, `invalidFileType`
  - **removeItem**: Bezpečnější – try/catch kolem URL parsing, revoke ObjectURL jen pro non-ready items
  - **loadExistingUrls**: Revoke ObjectURL jen pro lokální preview (status !== "ready")
  - **Default labels**: Fallback na angličtinu pokud labels nejsou předány
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace uploadLabels:
  - `uploadLabels` objekt z `t()` předáván do `useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels)`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace uploadLabels:
  - Stejný pattern: `uploadLabels` z `t()` → `useMediaUpload`
- `src/components/edit-post-dialog.tsx` – integrace uploadLabels + rozšířený interface:
  - `EditPostDialogProps.tLabels` rozšířen: `uploadSuccess`, `fileDeleted`, `invalidFileType`
  - `uploadLabels` sestaven z `tLabels` s fallbacky
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – rozšířené interface:
  - `PostCard.tLabels` a `PostsList.tLabels`: přidány `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/posts/page.tsx` – tLabels rozšířen:
  - Nové klíče: `uploadSuccess`, `fileDeleted`, `invalidFileType`
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – rozšířený interface + tLabels:
  - `CalendarViewProps.tCalendar`: přidány `uploadSuccess`, `uploadError`, `uploading`, `fileTooLarge`, `fileDeleted`, `invalidFileType`, `dropMedia`
  - EditPostDialog tLabels: hodnoty z tCalendar místo prázdných řetězců
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – tCalendar rozšířen:
  - Nové klíče: `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType`
- `src/messages/cs.json` – nové klíče v namespace `posts` a `calendar`:
  - `tooManyFiles`, `fileDeleted`, `invalidFileType` (posts)
  - `dropMedia`, `uploading`, `uploadSuccess`, `uploadError`, `fileTooLarge`, `fileDeleted`, `invalidFileType` (calendar)
- `src/messages/en.json` – totéž v angličtině
- `src/messages/uk.json` – totéž v ukrajinštině
- **Upload flow**: User vybere soubory → validace formátu → generování unikátní cesty `{userId}/{timestamp}-{filename}` → upload do `post-media` bucket → public URL → uložení do `media_urls` v DB
- **Limit**: Max 10 souborů na příspěvek, max 50MB na soubor
- **UX**: Spinner během nahrávání, CheckCircle2 po úspěchu, X tlačítko pro odstranění, toast notifikace
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-05

### Krok 59 – Univerzální Edit Modal + Kalendář: Drafty + Filtry statusu (DOKONČENO)
- `src/components/edit-post-dialog.tsx` – nová sdílená komponenta `EditPostDialog`:
  - Slouží jak pro editaci, tak pro vytvoření nového příspěvku
  - Používá se jak z kalendáře, tak ze seznamu příspěvků
  - Podpora: content, platformy, scheduled_at, status, location, tags, media (drag & drop + upload do Supabase Storage)
  - useMediaUpload hook pro nahrávání médií
  - Status pills (draft/scheduled/published/failed) – pouze v edit mode
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Koncepty (draft) viditelné**: Příspěvky se statusem `draft` se zobrazují s nižší opacitou (`opacity-60`)
  - **Filtry statusu**: Nové pill filtry (Vše, Koncept, Naplánované, Publikované, Neúspěšné) pod platform filtry
  - **Kliknutí na příspěvek**: Otevírá `EditPostDialog` modal místo redirectu na `/posts/[id]`
  - **activeStatusFilter**: Lokální stav pro UI filtr statusu (nezávislý na URL)
  - **Post interface rozšířen**: location, tags, media_urls
  - **getPostsForDayEffective**: Drafty bez `scheduled_at` se zobrazují v dnešním dni
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – odstraněn filtr `.neq("status", "draft")`:
  - `selectedStatus` se předává z URL searchParams (`?status=draft`)
  - Nové tCalendar klíče: editPost, postUpdated, addMedia
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – integrace EditPostDialog:
  - Tlačítko "Upravit" (ikona tužky) otevírá modal místo redirectu přes Link
  - PostCard přijímá `tLabels` prop a předává do EditPostDialog
  - PostsList přijímá `tLabels` prop a předává do PostCard
  - PostListItem rozšířen: location, tags, media_urls
- `src/app/[locale]/(dashboard)/posts/page.tsx` – rozšířené mapování příspěvků:
  - location, tags, media_urls se předávají do PostsList
  - tLabels prop s všemi potřebnými i18n klíči
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče v calendar namespace:
  - `filterAll`, `editPost`, `postUpdated`, `addMedia`
- Build: úspěšný, žádné TypeScript chyby

## 2026-05-04

### Krok 58 – Oprava ukládání štítků (tags) (DOKONČENO)
- **Kořen problému**: Uživatel napsal tag do inputu a klikl na "Uložit" bez Enter/Space. Text zůstal v `tagDraft` a nikdy se nekomitoval do `tags` pole → do DB se uložilo prázdné pole.
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` (edit post):
  - **handleSave**: Před uložením se commitne zbylý `tagDraft` do `finalTags` (s normalizací + deduplikace)
  - `setTagDraft("")` po commitu
  - `updatePost` dostává `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}` – tag se commitne i při ztrátě fokusu
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` (new post):
  - **handleSubmit**: Stejný fix – commit `tagDraft` → `finalTags` před `createPostAction`
  - `tags: finalTags` (vždy pole, nikdy undefined)
  - Input: přidán `onBlur={() => commitTag(tagDraft)}`
- `src/lib/actions/posts.ts` – server actions už `tags` správně zpracovávají (žádná změna potřeba)
- Migrace `005_add_location_tags_to_posts.sql` – sloupec `tags TEXT[] DEFAULT '{}'` existuje
- Build: úspěšný, žádné TypeScript chyby

### Krok 57 – Upload médií do Supabase Storage (DOKONČENO)
- `src/hooks/use-media-upload.ts` – nový custom hook pro nahrávání médií:
  - **uploadFile**: Upload souboru do Supabase Storage bucket `post-media` s unikátní cestou `{userId}/{timestamp}-{filename}`
  - **addFiles**: Přidání souborů s validací (image/video, max 50MB, max 10 souborů), automatický upload po přidání
  - **removeItem**: Odstranění souboru + revoke ObjectURL + smazání ze storage
  - **loadExistingUrls**: Načtení existujících URL z DB (pro editaci příspěvků)
  - **getMediaUrls**: Vrátí pole public URL všech ready souborů
  - **hasUploading**: Indikace zda probíhá upload (blokuje odeslání formuláře)
  - **Stavy**: `uploading` (spinner) → `ready` (CheckCircle2) / `error` (toast error)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – integrace useMediaUpload:
  - Drag & drop zóna s vizuální feedback (border-indigo při drag)
  - Preview grid (3/4 sloupce) s thumbnails, upload progress overlay, success indicator
  - File size validation (50MB limit) + toast error
  - Blocking upload při submit – toast.info("Nahrávám...")
  - mediaUrls se předávají do createPostAction
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – integrace useMediaUpload:
  - loadExistingUrls při načtení příspěvku z DB (media_urls pole)
  - Stejný UI jako new post (drag & drop, preview grid, stavy)
  - mediaUrls se předávají do updatePost
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `posts.uploading`, `posts.uploadSuccess`, `posts.uploadError`, `posts.fileTooLarge`
- Build: úspěšný, žádné TypeScript chyby

### Krok 56 – Kalendář: Oprava mobilního zobrazení (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – opravy mobilního Agenda View:
  - **Navigace měsíci**: Šipky nyní posouvají o celý měsíc (`previousMonth`/`nextMonth`) místo o 1 den
  - **Větší touch-targety**: Šipky zvětšeny na `h-10 w-10` (40x40px) s ikonami `h-5 w-5` pro snadné trefení palcem
  - **Sticky hlavička**: Hlavička s měsícem a šipkami je `sticky top-0` s `backdrop-blur-xl` – zůstává vidět při scrollování dnů
  - **Všechny dny měsíce**: Nový `mobileAgendaDays` useMemo generuje VŠECHNY dny aktuálního měsíce (startOfMonth → endOfMonth), nejen dny s příspěvky
  - **Prázdné dny**: Dny bez příspěvků zobrazují "Žádné příspěvky" + malé `+` tlačítko. Kliknutí na celý řádek otevře modal pro nový příspěvek
  - **Plně scrollovatelný seznam**: Seznam dnů má `max-h-[calc(100vh-280px)]` a `overflow-y-auto`
  - **České měsíce 100%**: Název měsíce v hlavičce z `months[month]` (props z `t.raw("months")`) + v seznamu dnů `months[day.getMonth()]` – vždy z lokálních překlادů
  - **Jeden kontejner**: Celý mobilní view je v jednom `rounded-[20px]` kontejneru místo dvou samostatných karet
- Build: úspěšný, žádné TypeScript chyby

### Krok 55 – Kalendář: Modal pro nový příspěvek + oprava filtrů + i18n + UI polish (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní vylepšení:
  - **Modal Dialog pro nový příspěvek**: Kliknutí na "+ Přidat příspěvek" v mobilním Agenda View otevírá modal s formulářem místo redirectu na /posts/new
    - Formulář: obsah, platformy (pill tlačítka s ikonami), lokace, štítky, DateTimePicker
    - Tlačítka: Koncept / Naplánovat / Publikovat (stejný styl jako /posts/new)
    - Po úspěchu: toast + reload stránky
    - Reset formuláře při zavření modálu
  - **Oprava filtrů platforem**: UI tlačítka nyní používají `activePlatformFilter` (lokální stav) místo `selectedPlatform` (props z URL) – filtry fungují správně
  - **Oprava příspěvků v gridu**: Desktop grid používá `getPostsForDayEffective` (respektuje filtry) místo `getPostsForDay`
  - **Kliknutí na den**: Zachováno – redirect na `/posts/new?date=YYYY-MM-dd`
  - **Česká lokalizace Agenda View**: `formatAgendaDate` s `date-fns/locale/cs` – dny a měsíce v češtině (čtvrtek, 6. května 2026)
  - **Lokalizace množného čísla**: CS (příspěvek/příspěvky/příspěvků), UK (публікація/публікації/публікацій), EN (post/posts)
  - **Lokalizace "+ more"**: další / більше / more
  - **UI polish**: Lepší kontrast mřížky (`border-white/10`), zvýraznění dneška (`bg-indigo-500/5 ring-indigo-500/20`), tmavší dny mimo měsíc (`bg-black/30`)
  - **Nové stavy**: `formContent`, `formPlatforms`, `formScheduledAt`, `formLocation`, `formTags`, `formTagDraft`, `formLoading`, `formError`
  - **Nové funkce**: `handleOpenNewPostModal`, `handleToggleFormPlatform`, `handleCommitTag`, `handleRemoveTag`, `handleFormSubmit`
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – rozšířený `tCalendar` props o 16 nových klíčů
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče:
  - `calendar.addPost`, `calendar.newPost`, `calendar.content`, `calendar.contentPlaceholder`
  - `calendar.selectPlatforms`, `calendar.saveDraft`, `calendar.schedule`, `calendar.publishNow`
  - `calendar.scheduledAt`, `calendar.saving`, `calendar.addTags`, `calendar.locationPlaceholder`
  - `calendar.postCreated`, `calendar.errorSaving`, `calendar.characterCount`, `calendar.maxFilesReached`
- Build: úspěšný, žádné TypeScript chyby

### Krok 54 – Kalendář: Mobile Agenda View + Klikání na dny a příspěvky (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – kompletní přepracování:
  - **Desktop (lg+)**: Měsíční/týdenní mřížka zachována (hidden lg:block)
  - **Mobile (pod lg)**: Nový Agenda View – vertikální seznam dnů s příspěvky
    - Navigace: šipky pro posun dnů, název měsíce a roku
    - Prázdný stav: ikona kalendáře + hláška "Žádné příspěvky" (lokalizováno)
    - Dny s příspěvky: kroužek s číslem dne (gradient pro dnes), název dne, počet příspěvků
    - Karty příspěvků: ikona platformy + obsah + čas, barevné statusy (published/scheduled/failed)
    - Tlačítko "+ Přidat příspěvek" pod každým dnem
  - **Kliknutí na den** (desktop + mobile): redirect na `/posts/new?date=YYYY-MM-dd`
  - **Kliknutí na příspěvek**: `stopPropagation` + redirect na `/posts/[id]`
  - **Filtry platforem**: zachovány, funkční na obou zobrazeních
  - **Navigace Měsíc/Týden**: pouze desktop (hidden lg:flex)
- `src/messages/cs.json`, `en.json`, `uk.json` – klíč `calendar.noPostsThisDay` (přidán v předchozí relaci)
- Build: úspěšný, žádné TypeScript chyby

### Krok 53 – DB Sync: Média, Štítky, Lokace (DOKONČENO)
- `supabase/migrations/005_add_location_tags_to_posts.sql` – nová migrace:
  - Přidány sloupce `location TEXT DEFAULT NULL` a `tags TEXT[] DEFAULT '{}'` do tabulky `posts`
- `src/lib/actions/posts.ts` – rozšířené server actions:
  - `createPostAction` – nově přijímá a ukládá `location`, `tags` (kromě již existujícího `mediaUrls`)
  - `updatePost` – nově přijímá a aktualizuje `location`, `tags`
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – `handleSubmit` předává do `createPostAction`:
  - `location` z inputu, `tags` z badge seznamu, `mediaUrls` z dropzóny (jména souborů)
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku:
  - useEffect načítá z DB i `location`, `tags`, `media_urls`
  - `handleSave` předává do `updatePost` všechny tři pole
- **Poznámka:** Média se ukládají jako jména souborů. Pro produkci bude potřeba upload do Supabase Storage
- Build: úspěšný, žádné TypeScript chyby

### Krok 52 – Kalendář pro plánování obsahu (DOKONČENO)
- `src/app/[locale]/(dashboard)/calendar/page.tsx` – nová Server Component stránka:
  - Načítá příspěvky z DB (`posts` tabulka) filtrované podle `user_id` a `status != draft`
  - Předává data do Client Component `_calendar-view` s lokalizací
- `src/app/[locale]/(dashboard)/calendar/_calendar-view.tsx` – Client Component s interaktivním kalendářem:
  - **Mřížka kalendáře**: 7 sloupců (Po-Ne), `border border-white/5`, glassmorphism (`bg-card/40 backdrop-blur-md rounded-[20px]`)
  - **Hlavička**: Šipky pro přepínání měsíců/týdnů, název měsíce lokalizovaný, přepínač Měsíc/Týden
  - **Příspěvky v buňkách**: Skleněné karty (`bg-indigo-500/20`) s ikonou platformy, časem a ukázkou obsahu
  - **Status barvy**: published = emerald, scheduled = indigo, failed = red
  - **Filtry platforem**: Pill tlačítka nad kalendářem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok) s ikonami
  - **Dnes**: Gradient kroužek (`from-indigo-600 to-purple-600`) s glow efektem
  - **Navigace**: `date-fns` pro generování dnů v měsíci/týdnu, `weekStartsOn: 1` (pondělí)
- `src/components/dashboard/sidebar.tsx` – přidána `Calendar` ikona do `ICON_MAP`
- `src/app/[locale]/(dashboard)/layout.tsx` – přidána položka Kalendář do `navItems` a `mobileNavItems`
- `src/components/dashboard/mobile-nav.tsx` – přidána položka Kalendář do spodního menu
- `src/messages/cs.json`, `en.json`, `uk.json` – nové sekce `calendar.*` (title, subtitle, month, week, weekdays, months, filtry)
- `nav.calendar` přidán do všech tří jazyků
- Build: úspěšný, žádné TypeScript chyby

### Krok 49 – Premium DateTimePicker – Redesign kalendáře (DOKONČENO)
- `src/components/ui/date-time-picker.tsx` – nová komponenta:
  - **Trigger tlačítko**: Glass styl (`bg-white/[0.03] border-white/10 rounded-xl h-12`), ikona kalendáře vlevo, vybrané datum textem uprostřed, ikona hodin vpravo
  - **Popover**: `bg-black/80 backdrop-blur-xl border border-white/10 rounded-[20px] p-4 shadow-2xl` – premium tmavý popover s blur efektem
  - **Kalendář**: Vlastní grid 7xN, bílé čísla, vybraný den s indigo-purple gradientem + glow (`shadow-[0_0_12px_rgba(99,102,241,0.4)]`), hover `bg-white/10 rounded-lg`, dnes vyznačen indigo borderem
  - **Navigace měsíců**: ChevronLeft/ChevronRight šipky, název měsíce lokalizovaný (`date-fns/locale/cs`, `uk`, `enUS`)
  - **Výběr času**: Dvě select pole (HH : MM) s hodnotami 0-23 a 00/15/30/45, glass styl, custom chevron ikona
  - **Lokalizace**: Český/anglický/ukrajinský kalendář přes `date-fns` locale + ruční weekDays (Po-Ne / Mo-Su / Пн-Нд)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – nahrazen `<input type="datetime-local">` za `<DateTimePicker>`
- **Dependence**: `date-fns`, `@radix-ui/react-popover` (nově nainstalovány)
- Build: úspěšný, žádné TypeScript chyby

### Krok 50 – Posts Page: Prémiový feed karet + animace (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx`
  - Kontejner stránky omezen na `max-w-3xl mx-auto` (už není roztažený přes celou obrazovku)
  - Seznam příspěvků přepojen na client list komponentu kvůli animacím a plynulému mazání
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx`
  - Nová struktura karty: header (platform icon + status badge + akce), výrazný content (`text-lg`), footer s border-top (created date + scheduled time s ikonou hodin)
  - Styl karty dle specifikace (`rounded-[24px]`, `bg-card/40`, `backdrop-blur`, jemný indigo hover border)
  - Framer Motion: `<AnimatePresence>` + enter/exit animace (fade-in + slide-up, při smazání plynulý exit)
  - Mazání: po úspěchu se karta okamžitě odstraní ze seznamu (bez refresh)

### Krok 51 – Editor příspěvků: Média, Lokace, Štítky (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`
  - Přidána sekce Médií pod pole Obsah: drag & drop zóna (dashed border, glass hover) + náhledy v gridu + mazání
  - Přidán input pro Lokaci (MapPin vlevo) pod výběr platforem
  - Přidána sekce Štítky: Enter/mezerník vytvoří tag odznáček s křížkem, indigo/purple gradient
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`
  - Sjednocen vizuál na prémiový glass layout a doplněny stejné sekce (Média, Lokace, Štítky)
- `src/messages/cs.json`, `en.json`, `uk.json`
  - Nové i18n klíče: `addMedia`, `locationPlaceholder`, `addTags`, `maxFilesReached`

## 2026-05-03

### Krok 48 – Výpis příspěvků z databáze (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní přepracování:
  - **Načítání z DB**: Query nyní filtruje podle `user_id` aktuálního uživatele (`.eq("user_id", user.id)`) – uživatel vidí pouze své příspěvky
  - **Řazení**: `order("created_at", { ascending: false })` – nejnovější první
  - **Filtry**: Pills filtry s novými i18n klíči (`statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`)
  - **Empty State**: Zachován krásný vizuální prázdný stav s velkou ikonou `FileText` a fialovou září
- `src/app/[locale]/(dashboard)/posts/_post-card.tsx` – nová Client Component pro karty příspěvků:
  - **Design**: Premium Glass (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[20px] p-6`)
  - **Obsah**: Text příspěvku (content, max 200 znaků preview), ikony platforem (Instagram, Facebook, X, LinkedIn, YouTube, TikTok), datum vytvoření, čas naplánování (Calendar ikona)
  - **Status Badge**: Barevné odznaky – draft (šedý), scheduled (indigo/modrý), published (zelený/emerald), failed (červený/red)
  - **Akce**: Edit (Edit ikona) + Delete (Trash2 ikona s `confirm()` dialogem)
  - **Lokalizace dat**: `toLocaleDateString()` s locale podle jazyka (cs-CZ, uk-UA, en-US)
- `src/lib/actions/posts.ts` – oprava `deletePost`:
  - Přidán auth check (`supabase.auth.getUser()`)
  - Přidán `.eq("user_id", user.id)` – lze smazat pouze vlastní příspěvky
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `statusDraft`, `statusScheduled`, `statusPublished`, `statusFailed`, `deleteConfirm`
- **LocaleSwitcher**: Zkontrolováno – kód je správný, používá `locales.find()` pro labely. Žádný "login" bug nebyl nalezen (pravděpodobně již opraven dříve)
- Build: úspěšný, žádné TypeScript chyby

### Krok 47 – Přechod na klasický Login (E-mail + Heslo) (DOKONČENO)
- `src/components/auth/email-signin.tsx` – kompletní přepsání: odstraněn Magic Link (OTP) systém, nahrazen klasickým loginem s heslem (`signInWithPassword`), přidána registrace (`signUp`), přepínač režimů signin/signup, pole pro heslo s toggle visibility (Eye/EyeOff), validace email verification (pokud uživatel nemá ověřený e-mail, dostane chybovou hlášku + automatické odhlášení), redirect po registraci na `/[locale]/dashboard`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové i18n klíče: `signIn`, `signUp`, `signingIn`, `emailNotVerified`, `invalidCredentials`, `signInError`, `signUpError`, `emailAlreadyExists`, `checkEmailToVerify`, `emailVerified`, `emailNotVerifiedBadge` – odstraněny staré OTP klíče (`checkEmailTitle`, `checkEmailDesc`, `sendingEmail`, `rateLimitExceeded`, `tryAgainIn`, `otpSendError`)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – do sekce Profil přidán řádek s e-mailem a verification badge (zelený „Ověřen" s CheckCircle2 vs. oranžový „Neověřen" s AlertCircle)
- Design: Inputy s ikonami (Mail, Lock) vlevo, glassmorphism styl (`bg-white/[0.03]`, `rounded-2xl`), tlačítko „Přihlásit se" / „Zaregistrujte se", odkazy „Zapomněli jste heslo?" a „Nemáte účet? Zaregistrujte se"
- Build: úspěšný, žádné TypeScript chyby

### Krok 8.1 – Login: Přidání e-mailu (UI + i18n) (DOKONČENO)
- `src/app/[locale]/(auth)/login/page.tsx` – pod Google tlačítko přidán divider „nebo“, e-mail input + CTA a vrácen privacy disclaimer s odkazem na `/privacy`
- `src/components/auth/email-signin.tsx` – nový klientský blok pro přihlášení e-mailem přes Supabase OTP (magic link) včetně designu inputu a tlačítka
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `auth.or`, `auth.emailPlaceholder`, `auth.continueWithEmail`, `auth.privacyDisclaimer`

### Krok 8.2 – Login: Magic Link logika a redesign rozložení (DOKONČENO)
- `src/components/auth/email-signin.tsx` – implementována logika Supabase Magic Link (`signInWithOtp`), přidán Success View s ikonou obálky a fialovou září, aktualizován stav tlačítka při načítání („Odesílám...“) a vizuální polish (čistě bílé tlačítko, jemný border inputu)
- `src/app/[locale]/(auth)/login/page.tsx` – přesunut Privacy Disclaimer z patičky přímo pod blok přihlášení e-mailem pro lepší vizuální celistvost
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro Success View (`checkEmailTitle`, `checkEmailDesc`) a stav odesílání (`sendingEmail`)
- Sjednocení login bloku do jednoho vycentrovaného celku

### Krok 8.2.1 – Login: UX pro Supabase rate limit (DOKONČENO)
- `src/components/auth/email-signin.tsx` – přidán perzistentní cooldown přes `localStorage` a uživatelské hlášky místo console error (eliminuje spam při refreshi)
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny klíče `rateLimitExceeded`, `tryAgainIn`, `otpSendError`

### Krok 46 – Účty: Drag & Drop pořadí sítí + přidání YouTube a TikTok (DOKONČENO)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – ikony platforem jsou přetahovatelné přes Framer Motion `Reorder` (lokální `useState`), včetně jemného zvětšení + výraznějšího glow při drag; zároveň doplněny platformy YouTube a TikTok a labely jsou napojené na i18n
- `src/components/ui/social-icons.tsx` – přidány brand ikony `Youtube` a `TikTok` (inline SVG)
- `src/app/api/accounts/route.ts` – rozšířen allowlist platforem o `youtube` a `tiktok`
- `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json` – doplněny překlady `accounts.platforms.*` pro nové platformy (a sjednocení labelů v UI)

## 2026-05-02

### Krok 45 – Final UI Polish: Odstranění redundantních log a oprava prázdného stavu Účtů (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/app/[locale]/(dashboard)/templates/new/page.tsx` – odstraněno redundantní `<Logo />` z hlaviček stránek (logo zůstává pouze v sidebaru)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava logiky prázdného stavu: „Žádné propojené účty“ se nyní skrývá, pokud je aktivní formulář pro připojení platformy (`!selectedPlatform && accounts.length === 0`)
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – ověřeno vycentrovaný nadpis „Nová šablona“ nad glass kartou
- Sjednocení vzhledu vnitřních stránek dashboardu pro maximální čistotu rozhraní

### Krok 44 – Oprava i18n chyby MISSING_MESSAGE na stránce Účty (DOKONČENO)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněn chybějící klíč `accounts.connectAccount`, který používá `src/app/[locale]/(dashboard)/accounts/page.tsx`
- Fixuje runtime chybu: `MISSING_MESSAGE: Could not resolve accounts.connectAccount for locale cs`
- Pozn.: V Krok 42 bylo mylně uvedeno, že klíč už existuje v `cs.json`

### Krok 42 – Tuning formulářů: Glass kontejnery, Inputy, Tlačítka, Branding (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/new/page.tsx` – kompletní redesign formuláře „Nový příspěvek":
  - **Glass kontejner**: `bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`
  - **Inputy/Textarea**: `bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30`
  - **Tlačítka**: Primární (Naplánovat, Publikovat) – `bg-gradient-to-br from-indigo-600 to-purple-600` + indigo glow shadow, sekundární (Koncept) – glass outline
  - **Platform pills**: Aktivní `bg-indigo-500/20 border-indigo-500/50 text-indigo-300`, neaktivní `bg-white/[0.03] border-white/5`
  - **Branding**: Logo v horním rohu, grid pattern na pozadí, indigo + purple záře v rozích
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – stejný redesign:
  - Glass kontejner, styled inputy/textarea, gradient tlačítko „Vytvořit", branding (Logo + grid + záře)
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – redesign formuláře „Propojit účet":
  - Nahrazen `<Card>` → glass kontejner (`bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl`)
  - Inputy: `bg-black/20 border-white/10 rounded-xl` s indigo focus ring
  - Tlačítko „Propojit účet": gradient + glow shadow
  - Branding: Logo v horním rohu, grid pattern, indigo + purple záře
  - I18N: Klíč `accounts.connectAccount` již existuje v `cs.json` („Propojit účet") – žádný nový klíč nutný
- `src/components/ui/logo.tsx` – importován do všech tří stránek pro brand konzistenci
- Build: úspěšný, žádné TypeScript chyby

### Krok 41 – Redesign stránky Příspěvky (Posts) – Prémiový vzhled (DOKONČENO)
- `src/app/[locale]/(dashboard)/posts/page.tsx` – kompletní redesign vizuálu:
  - **Hlavička**: Subtitle "0 příspěvků" s jemnější barvou (`text-muted-foreground/60`) jako u Účtů
  - **Tlačítko "Nový příspěvek"**: Gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s indigo glow stínem (`shadow-[0_0_20px_rgba(99,102,241,0.3)]`), radius `rounded-[20px]`
  - **Filtry (Pills)**: Neaktivní `bg-white/[0.03] border-white/5`, aktivní `bg-white/10 border-white/20 text-white`, radius `rounded-full px-4 py-1.5 text-sm`
  - **Empty State**: Odstraněn šedý Card box, nahrazen vizuálním centrem – ikona `FileText` s fialovou září (`blur-3xl`), text `text-muted-foreground/60`, sekundární tlačítko v glass stylu (`bg-card/40 border-white/5 backdrop-blur-md`)
  - **Pozadí**: Glow efekty v rozích (indigo + purple) pro hloubku, grid pattern z layoutu
  - **PostCard**: Glassmorphism (`bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]`)
  - **Responsivita**: Hlavička flex-col na mobilu, MobileNav `pb-24` v layoutu zajišťuje že obsah není překryt

### Krok 40 – Oprava ikon sociálních sítí a TypeScript chyb (DOKONČENO)
- `src/components/ui/social-icons.tsx` – nová sdílená komponenta pro brand ikony (Instagram, Facebook, Twitter, LinkedIn):
  - Implementace jako inline SVG, protože `lucide-react` tyto brand loga neexportuje
  - Rozhraní `SocialIconProps` s podporou `className` pro konzistentní stylizaci
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – oprava importů a TypeScript chyb:
  - Import ikon přesunut z `lucide-react` do `@/components/ui/social-icons`
  - Oprava chyby `ReactNode` při vykreslování komponent ikon (místo `{icon}` → `<Icon className="..." />`)
  - Oprava syntaxe IIFE v JSX pro kondicionální renderování modálu
- `src/app/[locale]/(auth)/onboarding/client.tsx` – úklid:
  - Odstraněny lokální inline SVG definice ikon
  - Import sdílených ikon z `@/components/ui/social-icons`

### Krok 39 – Prémiový dynamický favicon a Apple ikona (DOKONČENO)
- `src/app/icon.tsx` – implementován dynamický favicon (32x32) pomocí `next/og`:
  - Design: Vycentrované bold písmeno 'P' s brandovým gradientem (`linear-gradient(to bottom right, #4f46e5, #9333ea)`).
  - Pozadí: Průhledné pro moderní vzhled v prohlížeči.
- `src/app/apple-icon.tsx` – implementována ikona pro iOS (180x180):
  - Design: Písmeno 'P' s gradientem na čistě černém pozadí (#000) pro nativní vzhled aplikace na iPhone.
- Úklid: Odstraněn statický soubor `src/app/favicon.ico` pro prioritizaci dynamického generování.
- `src/app/layout.tsx` – ověření absence ručních `<link rel="icon">` tagů pro plnou kompatibilitu s Next.js App Router.

### Krok 38 – Sjednocení UI: Přesun odhlašení do Nastavení (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – odstraněn logout formulář a tlačítko z dolní části sidebaru pro čistší navigaci.
- `src/components/auth/logout-button.tsx` – vytvořena nová samostatná komponenta pro odhlášení:
  - Implementována logika `supabase.auth.signOut()` s následným redirectem na `/login`.
  - Stylizována jako "nebezpečná" akce (`hover:text-destructive`).
- `src/app/[locale]/(dashboard)/settings/page.tsx` – integrace `<LogoutButton />` do sekce "Nebezpečná zóna" (Danger Zone):
  - Tlačítko umístěno do interaktivního řádku s ikonou `ChevronRight` a efektem `hover:bg-destructive/5`.
  - Přidán padding `pb-32` k hlavnímu kontejneru stránky pro správné zobrazení na mobilu (nad spodním menu).
- `src/messages/cs.json`, `en.json`, `uk.json` – sjednocení a oprava překladového klíče `common.logout` napříč všemi jazyky.
- Oprava chyby `MISSING_MESSAGE` pomocí sjednocení namespace `common` (lowercase) v překladových souborech a komponentě.

### Krok 37 – Kompletní lokalizace (CZ, EN, UK) (DOKONČENO)
- `src/messages/uk.json` – doplnění chybějících překladů: klíč `logout` v sekci `common` a `title` v sekci `cookie`.
- `src/messages/cs.json` & `src/messages/en.json` – sjednocení překladů: přidán klíč `logout` do sekce `common` pro zajištění konzistence.
- `i18n.ts`, `middleware.ts` & `src/i18n/request.ts` – ověření správné konfigurace a podpory jazyka `uk` v celém i18n flow.
- `src/components/locale-switcher.tsx` – ověření viditelnosti a funkčnosti přepínače pro ukrajinštinu.

### Krok 36 – Finální vizuální polish dashboardu (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – integrace sjednocené `<Logo />` komponenty a vylepšení aktivního stavu položek menu (`bg-white/[0.03]`, `text-foreground`).
- `src/app/[locale]/(dashboard)/layout.tsx` – implementován background grid pattern a jemné, tušené barevné záře (glows) v rozích (`opacity-[0.03]`, `blur-[120px]`) pro větší hloubku pozadí.
- `src/app/[locale]/(dashboard)/page.tsx` – update typografie: nadpis zvětšen na `text-3xl` s `tracking-tight`, subtext nastaven na `text-muted-foreground/60`.
- `CLAUDE.md` & `AGENTS.md` – přidána sekce "Standard UI Postio" s definicí barevného schématu, radiusů (20px), efektů glassmorphismu a typografie.
- `src/app/[locale]/(dashboard)/layout.tsx` – integrace `<Logo />` komponenty do mobilního headeru.

### Krok 35 – Redesign Dashboardu: Karty a Úklid sidebaru (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` & `src/app/[locale]/(dashboard)/layout.tsx` – odstraněna duplicita položky "Nastavení" z hlavního menu; odkaz přesunut na ikonu ozubeného kolečka u profilu uživatele.
- `src/app/[locale]/(dashboard)/page.tsx` – update vizuální identity dashboardu:
  - Statistické karty: Implementován 'Premium Glass' styl (`bg-card/40 backdrop-blur-md`, `border-white/5`, `rounded-[20px]`), jemnější barva ikon.
  - Akční karta "Nový příspěvek": Dominantní gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem.
  - Ostatní akční karty: Sjednoceny do glass stylu s radiusy `rounded-[20px]`.
  - Upgrade Banner: Kompaktnější padding a posílený fialový glow efekt v pozadí.

### Krok 34 – Redesign karet na dashboardu (Vzhled) (DOKONČENO)
- `src/app/[locale]/(dashboard)/page.tsx` – update stylů karet pro prémiový vzhled:
  - Statistické karty: Implementován glassmorphism (`bg-card/40 backdrop-blur-md`, `border-white/5`), radius `rounded-[20px]`, zmenšeny ikony a hodnoty (`text-2xl`)
  - Akční karta "Nový příspěvek": Primární gradient (`bg-gradient-to-br from-indigo-600 to-purple-600`) s bílým textem pro maximální kontrast
  - Ostatní akční karty: Přepsány do stejného glass stylu jako statistické karty
- Vizuální sjednocení s mockupem přihlašovací stránky

### Krok 33 – Redesign Dashboardu (Sidebar a Layout) (DOKONČENO)
- `src/components/dashboard/sidebar.tsx` – nová komponenta Sidebaru:
  - Styl: Glassmorphism (`bg-card/50 backdrop-blur-md`), užší a elegantnější vzhled
  - Navigace: Implementován aktivní stav s barevným akcentem a zářícím indikátorem
  - Account Switcher: Přidána sekce v dolní části s údaji uživatele, tlačítkem Upgrade a nastavením
  - Branding: Integrace sjednocené `<Logo />` komponenty
- `src/app/[locale]/(dashboard)/layout.tsx` – aktualizace základní kostry:
  - Redukce vertikálního paddingu v headeru (`h-16` → `h-14`) pro lepší využití prostoru
  - Implementace `font-sans` (Inter/Geist) napříč layoutem
  - Radiusy: Sjednocení zaoblení na 20px (`--radius`) pro všechny kontejnery
- `src/lib/actions/auth.ts` – vytvoření Server Action pro odhlášení (`logoutAction`)
  - Řešení chyby serializace funkcí z Server do Client Componentu
- `src/app/layout.tsx` – oprava varování v konzoli u skriptu inicializace tématu (přidán `id="theme-init"`)

## 2026-05-01

### Krok 32 – Branding, i18n a Premium Dark styl pro Privacy stránku (DOKONČENO)
- `src/components/ui/logo.tsx` – nová sjednocená Logo komponenta:
  - Styl: Bold, `tracking-tighter`, primární barva pro 'P', foreground pro 'ostio'
- `src/messages/cs.json`, `en.json` – oprava i18n: přidán chybějící klíč `cookiesDesc` v namespace `privacy`
- `src/app/[locale]/privacy/page.tsx` – kompletní redesign na "Premium Dark" styl:
  - Pozadí: `bg-black`, font `font-sans` (Inter)
  - Layout: Centrování `max-w-3xl`, whitespace `py-12 lg:py-24`
  - Typografie: Nadpisy bílé, popisy `muted-foreground`, vylepšená čitelnost (leading-relaxed)
  - Logo: Integrace nové `Logo` komponenty v headeru
  - Tlačítko "Zpět": Redesign na `rounded-2xl` s jemným borderem a backdrop-blurem
- Ověření: Proběhl lint check, funkčnost i18n ověřena

### Krok 31 – Oprava mobilního zobrazení Login + Cookie Consent (DOKONČENO)


## 2026-04-28

### Krok 1 – Inicializace projektu (dokončeno dříve)
- Next.js 14 projekt s TypeScript, Tailwind, App Router
- Instalace: shadcn-ui, next-intl, @supabase/supabase-js, @supabase/ssr
- `.env.local` a `.env.example`
- `src/lib/supabase/client.ts` – browser klient

### Krok 2 – Supabase konfigurace (dokončeno dnes)
- `src/lib/supabase/server.ts` – server klient pro SSR (čte/žepíše cookies pro auth session)
- `src/lib/supabase/middleware.ts` – helper pro middleware (vrací `{ supabase, response }` pro refresh JWT tokenů)
- `supabase/migrations/001_initial_schema.sql` – 6 tabulek + RLS politiky + indexy
  - `users` – profil, plán (free/creator/pro), jazyk, streak, onboarded flag
  - `social_accounts` – platforma, jméno, access_token, is_active
  - `posts` – obsah, media_urls, platformy, status (draft/scheduled/published/failed)
  - `templates` – šablony příspěvků s premium flagem
  - `analytics` – impressions + engagements per post
  - `cookie_consents` – GDPR (necessary/analytics/marketing)
  - RLS: každý uživatel vidí/čte/mění pouze svá data (auth.uid() = user_id)
  - Analytics RLS přes EXISTS join na posts tabulku
  - Trigger: automatické updated_at na posts

### Krok 3 – i18n + middleware + layout struktura (dokončeno)
- `i18n.ts` – konfigurační soubor s locales (cs, en, uk)
- `src/i18n/request.ts` – next-intl request config pro Next.js 16
- `src/messages/cs.json`, `en.json`, `uk.json` – překladové soubory
- `middleware.ts` – kombinace Supabase auth refresh + next-intl routing
- `next.config.ts` – integrace next-intl plugin
- `src/app/layout.tsx` – root layout (minimal, bez fontů)
- `src/app/[locale]/layout.tsx` – locale layout s NextIntlClientProvider + ThemeProvider
- `src/app/[locale]/(auth)/layout.tsx` – layout pro auth stránky
- `src/app/[locale]/(dashboard)/layout.tsx` – dashboard layout se sidebar navigací
- `src/app/[locale]/(auth)/login/page.tsx` – login stránka s Google OAuth
- `src/components/auth/google-signin-button.tsx` – tlačítko Google přihlášení
- `src/app/auth/callback/route.ts` – auth callback route pro Supabase OAuth
- `src/app/[locale]/(dashboard)/page.tsx` – dashboard s statistikami a quick actions
- `src/components/providers/theme-provider.tsx` – light/dark mode provider
- `src/components/theme-toggle.tsx` – přepínač theme
- `src/components/locale-switcher.tsx` – přepínač jazyka
- `src/components/ui/card.tsx` – Card komponenta
- `src/components/ui/dropdown-menu.tsx` – DropdownMenu komponenta
- `.env.example` – šablona environment proměnných
- `globals.css` – primary barva změněna na indigo (#6366F1)
- Instalace: framer-motion, next-themes, @radix-ui/react-dropdown-menu
- Build úspěšný

### Krok 4 – Šablony + Analytics + Settings + Edit Post (dokončeno)
- `src/app/[locale]/(dashboard)/templates/page.tsx` – seznam šablon s delete/use
- `src/app/[locale]/(dashboard)/analytics/page.tsx` – analytika (impressions, engagements, rate)
- `src/app/[locale]/(dashboard)/settings/page.tsx` – nastavení profilu a plánu
- `src/app/[locale]/(dashboard)/posts/[id]/page.tsx` – editace příspěvku
- `src/lib/supabase/types.ts` – TypeScript typy pro Database
- `supabase/migrations/002_auth_trigger.sql` – auto-create user řádky při signup

### Krok 5 – Oprava TypeScript chyb (dokončeno)
- Odstraněno `Database` generikum z `createServerClient`/`createBrowserClient` – `@supabase/ssr` ho špatně předával
- Opraveno pořadí query chain: `.select("*")` před `.order()`
- Přidány typové anotace na `.map()` callback parametry
- Přidány null checky na Supabase response data
- Import `SupabaseClient` přesunut z `@supabase/ssr` do `@supabase/supabase-js`
- Build úspěšný bez TypeScript chyb

## 2026-04-29

### Krok 6 – Zprovoznit localhost bez Supabase (DOKONČENO)
**Hotovo:**
- `src/app/page.tsx` – redirect `/` → `/cs/login` (fallback pro dev mode)
- Middleware config matcher aktualizován
- Production build: redirect funguje (307 `/` → `/cs/login`)
- `/cs/login` vrací 200 OK

**Opravy:**
1. **Middleware publicRoutes bug** – `startsWith("/login")` nešlo pro `/cs/login` cesty
   - Fix: změněno na `includes("/login")` → locale-prefixed routy fungují
2. **Dashboard nav link bug** – sidebar odkazoval na `/{locale}/dashboard` místo `/{locale}/`
   - Fix: změněno href na `/{locale}` (route group `(dashboard)` nevytváří URL segment)
3. Google sign-in button: už měl disabled logiku (`isSupabaseConfigured` check) ✓
4. Dashboard layout: try/catch + redirect na login bez session ✓

**Výsledek:**
- Production: všechny routy fungují perfektně
- Dev mode (Turbopack): routy fungují po inicializaci kompilace
- Test: `npm run build && npm run start` → otevřít `http://localhost:3000`

**Poznámka:** Všechny soubory už mají try/catch kolem Supabase volání z předchozí session.

### Krok 7 – Supabase propojení + oprava auth callback (DOKONČENO)
**Hotovo:**
- `.env.local` – vyplněné SUPABASE_URL + ANON_KEY + SERVICE_ROLE_KEY
- `src/app/auth/callback/route.ts` – opravený OAuth callback flow
  - Dynamické čtení locale z referer header
  - Správné předávání cookies pro session
  - Redirect na dashboard po úspěšném loginu
- `.env.example` – vyčištěno (GOOGLE_CLIENT_ID/SECRET/NEXTAUTH_SECRET se nepoužívají – Supabase řeší OAuth server-side)
- Google OAuth přihlášení funkční: Login → Supabase OAuth → Callback → Dashboard
- Middleware auth check funkční – redirect na login bez session, cookies správně předávány

### Krok 8 – Social account connect API + Seed data + Cookie consent fix (DOKONČENO)
**Hotovo:**
- `src/app/api/accounts/route.ts` – POST endpoint pro uložení social account
  - Auth check (session required), validace platformy, insert do DB
- `src/app/[locale]/(dashboard)/accounts/page.tsx` – přepracováno na "use client"
  - Klik na platformu otevře formulář (account name + access token)
  - POST na `/api/accounts` → refresh seznam účtů
  - Disconnect tlačítko (is_active = false)
- `supabase/migrations/003_seed_templates.sql` – výchozí šablony pro nové uživatele
  - Rozšířený trigger `handle_new_user()` – 6 šablon + cookie consent záznam
  - UNIQUE index na `cookie_consents.user_id` pro upsert
- `src/components/cookie-consent.tsx` – oprava (odstraněn nepoužitý import `useTranslations("common")`)
- Překlady cs/en/uk – přidány klíče: `accessToken`, `accessTokenPlaceholder`, `connecting`, `errorConnecting`, `cancel`

**Poznámka:** Migrace `003_seed_templates.sql` – nahraj ručně přes Supabase Dashboard → SQL Editor (Supabase CLI není nainstalovaná)

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 9 – Onboarding flow (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/onboarding/page.tsx` – server component s auth checkem
- `src/app/[locale]/(auth)/onboarding/client.tsx` – 3-krokový onboarding wizard
  - Krok 1: Připojení social account (Instagram, Facebook, Twitter/X, LinkedIn)
  - Krok 2: Profil setup (jméno + zájmové kategorie)
  - Krok 3: Hotovo → redirect na dashboard
- Onboarding přesunut z `(dashboard)` do `(auth)` route group – žádné redirect loopy
- Dashboard layout (`(dashboard)/layout.tsx`) – redirect ne-onboardovaných uživatelů na `/onboarding`
- Social ikony (Instagram, Facebook, LinkedIn) – inline SVG (lucide-react je nemá)
- `src/app/api/onboarding/route.ts` – PATCH endpoint pro uložení profilu + onboarded=true
- Prázdný adresář `(dashboard)/onboarding/` vyčištěn
- Build úspěšný

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel

### Krok 10 – Oprava React 19 warningu (next-themes) (DOKONČENO)
**Hotovo:**
- `src/components/providers/theme-provider.tsx` – vlastní implementace bez `<script>` tagů
  - Čte/žepíše cookie `theme`, podporuje system preference listener
  - Plně kompatibilní s React 19 (žádné console warningy)
- `src/components/theme-toggle.tsx` – přepíná na `ThemeContext` z vlastního providera
- `next-themes` package odstraněn z `package.json`
- Console error pryč

### Krok 11 – Oprava přepínače jazyků (DOKONČENO)
**Hotovo:**
- `src/i18n/request.ts` – opravena validace locale + typy (requestLocale může být Promise)
- `cs.json` / `en.json` – prohozen obsah (byly zaměněné – cs měl en text a naopak)
- `uk.json` – správně
- `src/components/locale-switcher.tsx` – opraveno `router.push()` → `window.location.href`
  - Důvod: next-intl načítá překlady server-side přes `getMessages()`. Client-side navigace nereenderuje layout s novými překlady.
- `src/app/[locale]/(dashboard)/settings/page.tsx` – odstraněn hard-coded český text
  - Přidány i18n klíče: `saved`, `currentPlan`, `dangerZone`, `dangerZoneDesc`, `deleteAccount`
  - Plán ceny: ceny dynamické z `PLAN_PRICES` map + `common.free` klíč
  - Všechny 3 jazyky aktualizovány
- Build úspěšný

### Krok 12 – Oprava Supabase bezpečnostního warningu (DOKONČENO)
**Hotovo:**
- Všechna volání `getSession()` → `getUser()` v 5 souborech:
  - `src/app/api/accounts/route.ts`
  - `src/app/api/onboarding/route.ts`
  - `src/app/[locale]/(auth)/onboarding/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `getUser()` ověřuje session proti Supabase Auth serveru (bezpečnější než `getSession()` z cookies)
- Console warning pryč

### Krok 13 – Oprava settings page + dev mode fallback (DOKONČENO)
**Hotovo:**
- `middleware.ts` – přidán check `isSupabaseConfigured` + `supabaseError` flag
  - Bez auth session: redirect na login (když Supabase je configured)
  - Když Supabase není configured nebo throwne error: přístup bez auth (dev mode)
- `(dashboard)/layout.tsx` – opraven auth check s `supabaseAvailable` flag
  - Když Supabase throwne error: přístup bez redirectu na login
  - Onboarding check pouze pokud existuje session
- `settings/page.tsx` – přidán try/catch + dev mode indikátor
  - Bez session: ukazuje "Demo uživatel" + warning banner
  - S session: normální funkčnost s databází

**Poznámka:** Settings stránka vyžaduje přihlášení přes Google OAuth pro plnou funkčnost.
- curl test: 307 redirect na /login (bez auth cookies) – správné chování
- V browseru s přihlášením: settings funguje plně

**Následující kroky:**
- [ ] Mobile responsive test dashboard layout
- [ ] Deploy na Vercel
- [ ] Test settings page s přihlášeným uživatelem v browseru

## 2026-04-30

### Krok 14 – Oprava přepínání jazyků (DOKONČENO)
**Problém:** Aplikace renderovala vždy české překlady bez ohledu na URL (`/en/*`, `/uk/*`).

**Příčina:** Server-side překlady (`getMessages()` / `getTranslations()`) spoléhaly na `requestLocale`, které v tomto setupu nebylo spolehlivě dostupné → fallback na `cs`.

**Hotovo:**
- `src/app/[locale]/layout.tsx` – `getMessages({ locale })` (locale z route params)
- Server stránky/layouty – `getTranslations({ locale, namespace })` místo `getTranslations(namespace)`
  - `src/app/[locale]/(auth)/login/page.tsx`
  - `src/app/[locale]/(dashboard)/layout.tsx`
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/app/[locale]/(dashboard)/templates/page.tsx`
  - `src/app/[locale]/(dashboard)/analytics/page.tsx`
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
- `src/components/locale-switcher.tsx` – opraveno zachování query stringu (přidán `?`)

**Výsledek:** Přepínání `cs/en/uk` funguje, překlady odpovídají aktivnímu locale v URL.

### Krok 15 – Oprava problikávání tmavého režimu (DOKONČENO)
**Problém:** Při navigaci mezi stránkami v tmavém režimu problikával světlý režim a zpomaloval aplikaci.
**Příčina:** Při `theme=system` server neměl informaci o `prefers-color-scheme`, proto rendroval light a až po hydrataci se přepnul na dark.
**Řešení:**
- `src/app/layout.tsx` – early-init script v `<head>` nastaví `dark/light` ještě před prvním paintem (cookie `theme` + `matchMedia`)
- `src/app/layout.tsx` – server-side nastaví `<html class="dark">` pokud cookie je `theme=dark`
- `suppressHydrationWarning` na `<html>` a `<body>` – potlačuje hydration warning (theme se liší server vs client)
- Theme provider na client-side již jen udržuje stav a reaguje na změny

### Krok 16 – Oprava přepínače jazyka v Nastavení (DOKONČENO)
**Problém:** Select „Profil → Jazyk“ na stránce Nastavení měnil jen hodnotu ve formuláři/DB, ale nepřepínal jazyk UI.

**Řešení:**
- `src/app/[locale]/(dashboard)/settings/page.tsx` – jazyk UI se přepne až po potvrzení tlačítkem „Uložit“
  - select pouze změní lokální stav
  - po úspěšném uložení profilu (nebo v dev mode) proběhne hard navigace na stejnou stránku s novým locale v URL (`/cs|en|uk/...`) včetně zachování query stringu

### Krok 17 – Dev server: 404 na některých routách (WSL/Turbopack) (DOKONČENO)
**Problém:** V dev módu se objevovaly 404 pro některé stránky (`/cs/posts`, `/cs/templates`, `/cs/settings`), i když `next build` tyto routy generuje správně.

**Řešení:**
- `package.json` – `npm run dev` nyní spouští webpack dev server (`next dev --webpack`)
- Přidán script `dev:turbo` pro spuštění Turbopacku explicitně (pokud je potřeba)

### Krok 18 – Mobile responsive dashboard layout (DOKONČENO)
**Problém:** Dashboard nefungoval správně na mobilních zařízeních – hamburger menu bez overlay/ESC, filters přetekly, tituly se nevešly.

**Hotovo:**
- `src/components/mobile-nav.tsx` – nový client component pro mobilní navigaci
  - Otevření/zavření přes `useState` (žádný checkbox hack)
  - Overlay backdrop – kliknutí mimo zavře menu
  - Klávesa `Escape` zavře menu
  - Automatické zavření po navigaci (`useEffect` na `pathname`)
  - Logout přes browser Supabase klient
- `src/app/[locale]/(dashboard)/layout.tsx` – integrovan MobileNav
  - Desktop sidebar (`md:flex`) + mobilní hamburger (`md:hidden`)
  - Padding `p-4 md:p-6` pro menší okraje na mobilu
- Všechny dashboard stránky – responsive hlavičky:
  - `text-2xl sm:text-3xl` na všechny `<h1>` tituly
  - Header s tlačítkem: `flex-col sm:flex-row` (pod sebou → vedle sebe)
  - Tlačítka: `w-full sm:w-auto` (plná šířka na mobilu)
  - Filters na posts: `flex-wrap` (omíjení na více řádků)
- Build úspěšný

### Krok 19 – Pricing comparison karta na dashboardu (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(dashboard)/page.tsx` – přidána `PricingCard` komponenta
  - Tabulka srovnání plánů: Free / Creator / Pro
  - Sloupce: cena (Kč, EUR, USD), limity funkcí
  - Řádky: Sociální účty, Příspěvky/měsíc, Šablony, Analytika, Prioritní podpora
  - Checkmark (✓) / dash (—) indikátory dostupnosti funkcí
  - Badge aktuálního plánu uživatele (z DB)
  - Tlačítko „Upgrade" → redirect na Nastavení
  - Překlady předávány jako props z server-side `getTranslations()`
- Překlady (cs/en/uk) – nové klíče v `dashboard` namespace:
  `upgradeTitle`, `upgradeSubtitle`, `currentPlan`, `socialAccounts`,
  `postsPerMonth`, `templates`, `analytics`, `prioritySupport`,
  `unlimited`, `upgrade`, `downgrade`, `perMonth`
- Build úspěšný

### Krok 20 – Fix: 500 na dashboardu v dev mode (RSC serializace ikon) (DOKONČENO)
**Problém:** `MobileNav` (client component) dostával z `(dashboard)/layout.tsx` `navItems` včetně Lucide ikon (React komponenty), které nelze předávat přes Server→Client props → 500 na `/cs`.

**Řešení:**
- `src/components/mobile-nav.tsx` – `navItems.icon` změněn na string key + lokální mapování ikon
- `src/app/[locale]/(dashboard)/layout.tsx` – pro mobil se předává `mobileNavItems` s plain hodnotami
- Build úspěšný

### Krok 21 – Šablony: tlačítko „Nová šablona“ + create stránka (DOKONČENO)
**Problém:** Na stránce Šablony klik na „Nová šablona“ nic neudělal (tlačítko bez navigace/handleru v server komponentě).

**Hotovo:**
- `src/app/[locale]/(dashboard)/templates/page.tsx` – tlačítko změněno na link `/${locale}/templates/new`
- `src/app/[locale]/(dashboard)/templates/new/page.tsx` – nový formulář pro vytvoření šablony (name + content)
- `src/lib/actions/templates.ts` – server action `createTemplate()` (insert do Supabase + revalidate `/templates`)
- `src/messages/cs.json`, `en.json`, `uk.json` – doplněny klíče pro formulář (`namePlaceholder`, `content`, `contentPlaceholder`, `errorSaving`)

### Krok 22 – UI/UX refresh (dark SaaS) – login + dashboard (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – moderní gradient background pro auth (jemné glow blob efekty)
- `src/app/[locale]/(auth)/login/page.tsx` – premium karta (rounded-2xl, jemný border, shadow, backdrop blur) + nadpis Postio s text gradientem
- `src/components/auth/google-signin-button.tsx` – Google tlačítko ve „white“ stylu (vyšší důvěryhodnost)
- `src/app/[locale]/(dashboard)/page.tsx`
  - stat karty: čísla zvětšena na `text-4xl font-bold`
  - quick actions: „Nový příspěvek“ jako primární CTA (nejvýraznější), ostatní větší + výraznější hover
  - pricing tabulka odstraněna, nahrazena elegantním Pro CTA bannerem
- `src/messages/cs.json`, `en.json`, `uk.json` – nové dashboard klíče pro CTA banner (`proCtaTitle`, `proCtaSubtitle`, `proCtaButton`)

### Krok 23 – Konzistentní dark mode napříč celou aplikací (DOKONČENO)
**Problém:** Auth stránky (login, onboarding) měly hard-coded barvy (`border-white/10`, `from-white`, `bg-indigo-500`) které špatně fungovaly v light mode a lišily se od dashboardu.

**Hotovo:**
- `src/app/[locale]/(auth)/layout.tsx` – glow efekty: `bg-primary/5` (light) / `dark:bg-primary/10` (dark), odstraněn `bg-indigo-500`
- `src/app/[locale]/(auth)/login/page.tsx` – karta: `border` místo `border-white/10`, `bg-card` místo `bg-card/80`, gradient: `from-foreground` místo `from-white`
- `src/app/[locale]/(dashboard)/page.tsx` – UpgradeBanner: `border` místo `border-white/10`, glow efekty s `dark:` variantami, odstraněn `bg-indigo-500`
- Všechny barvy nyní přes CSS proměnné (`--card`, `--foreground`, `--primary`, `--border`) – stejný vzhled v light i dark mode

### Krok 24 – Light mode redesign (šedé pozadí + bílé karty) (DOKONČENO)
**Hotovo:**
- `src/app/globals.css` – `:root` proměnné upraveny pro styl dashboardu:
  - `--background: oklch(0.967 0 0)` – světle šedé pozadí místo bílé
  - `--ring: oklch(0.55 0.25 275)` – focus ring v primary barvě místo šedé
  - `--sidebar: oklch(1 0 0)` – sidebar bílý
  - `--sidebar-primary: oklch(0.55 0.25 275)` – sidebar primary v purple
- `src/components/ui/card.tsx` – karty s `rounded-xl` + `shadow-md` (light) / `shadow-sm` (dark)
- `src/app/[locale]/(dashboard)/layout.tsx` – header + sidebar mají `shadow-sm dark:shadow-none`, main content `bg-background`
- Světlý režim nyní odpovídá referenčnímu designu: šedé pozadí, bílé karty s jemnými stíny

### Krok 25 – Deploy na Vercel (DOKONČENO)
**Hotovo:**
- Aplikace nasazena na Vercel (free tier)
- Environment variables nakonfigurovány: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- GitHub repozitář propojen s Vercel projektem pro automatické deploye
- Production build úspěšný, aplikace dostupná na Vercel URL

### Krok 26 – Oprava odkazu "Zjistit více" v cookie banneru (DOKONČENO)
**Problém:** Tlačítko „Zjistit více" v cookie consent banneru bylo obyčejný `<button>` bez `onClick` handleru – kliknutí nic nedělalo.

**Hotovo:**
- `src/app/[locale]/privacy/page.tsx` – nová veřejná stránka Ochrany osobních údajů (mimo auth guard)
  - Sekce: data která sbíráme, jak je používáme, cookies, sdílení dat, práva, kontakt
  - Plně lokalizovaná (cs/en/uk) přes `getTranslations()`
- `src/components/cookie-consent.tsx` – `<button>` → `<Link>` na `/{locale}/privacy`
  - Dynamické locale z `usePathname()`
- `src/messages/cs.json`, `en.json`, `uk.json` – nový namespace `privacy` (14 klíčů)

**Následující kroky:**
- [ ] Social accounts – skutečné OAuth integrace (Instagram, Facebook, Twitter, LinkedIn)
- [ ] Posts – CRUD operace s databází (create, schedule, publish)
- [ ] Analytics – reálná data z API sociálních sítí
- [ ] Payment integrace (Stripe) pro Creator/Pro plány
- [ ] Email notifikace (Resend)


### Krok 30 – Majestátní pravý panel na login stránce (DOKONČENO)
**Hotovo:**
- `src/components/auth/login-visual.tsx` – dashboard mock zvětšen o 25 % (`scale-125` místo `scale-110`)
  - Grid pattern v pozadí zesílen na opacitu 8 % (z 2,5 %) pro jemnější viditelnost
  - Přidán silný měkký glow efekt za dashboard: `blur-[100px]`, gradient purple→indigo→blue (30/20/10 %)
  – Glow je centrován (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`) s `z-[5]` a `pointer-events-none`

### Krok 27 – Login page redesign (DOKONČENO)

### Krok 28 – Responzivní auth layout + redesign vizuálního panelu (DOKONČENO)

### Krok 29 – Oprava pozice LocaleSwitcheru na login stránce (DOKONČENO)
**Hotovo:**
- `src/app/[locale]/(auth)/login/page.tsx` – odstraněn obalový `<div>` kolem `<LocaleSwitcher />`
  - Třídy pro pozicování (`absolute top-8 right-8 z-50`) přeneseny přímo na komponentu
  - Levý panel už má třídu `relative`, takže absolutní pozicování funguje správně
**Hotovo:**
- `src/app/globals.css` – tmavý gradient na pozadí, `--radius: 20px`, touch targety 48px na mobilu
- `src/app/[locale]/(auth)/layout.tsx` – wrapper bez `bg-background`
- `src/app/[locale]/(auth)/login/page.tsx` – Layout 40/60 přesné šířky (`w-[40%]` / `w-[60%]`)
  - LocaleSwitcher: absolutně v pravém horním rohu levého panelu (`absolute right-8 top-8`, padding 2rem)
  - Nadpis „P‍ostio" zvětšen na `text-5xl` / `sm:text-6xl`
  - „Začněte s Postio" zvětšen na `text-3xl` / `sm:text-4xl`
  - LoginVisual skryt `hidden lg:flex` – na mobilu se nevykresluje vůbec
- `src/components/auth/login-visual.tsx` – kompletní redesign:
  - Dashboard mock zvětšen ~30 % (padding `p-8`, bar chart `h-32`, čísla `text-xl`/`text-2xl`)
  - Pozadí: grid pattern (opacita 4 %) + fialová/modrá glow bloby (`blur-3xl`)
  - Všechny texty lokalizované přes props: Dashboard, This week, Posts, Reach, Eng., Post scheduled, +24%
- `src/components/auth/google-signin-button.tsx` – `rounded-2xl`, `h-12`, hover efekt `hover:-translate-y-0.5` + `hover:shadow-medium`
- `src/messages/cs.json`, `en.json`, `uk.json` – nové klíče: `visualDashboard`, `visualThisWeek`, `visualPosts`, `visualReach`, `visualEngagement`, `visualScheduled`, `visualEngagementUp`

### Krok 27 – Login page redesign (DOKONČENO)
**Hotovo:**
- `src/app/layout.tsx` – přidán **Inter** font přes `next/font/google` (variable `--font-sans`, `display: swap`)
- `src/app/globals.css` – vylepšený design systém:
  - `--font-sans` s fallback na `system-ui, sans-serif`
  - `--radius: 1rem` (16px, zvětšeno z 10px)
  - `--shadow-soft`, `--shadow-medium`, `--shadow-card` – nové shadow utility
  - `--gradient-hero`, `--gradient-subtle` – brand gradienty
  - Primary barva jemně upravena `oklch(0.56 0.22 275)` pro lepší kontrast
  - Light mode: `--background: oklch(0.985 0 0)` (čistější bílo-šedá)
- `src/app/[locale]/(auth)/layout.tsx` – čistý gradient background (`from-primary/[0.03]`)
- `src/app/[locale]/(auth)/login/page.tsx` – **split layout redesign**:
  - Levý panel: logo "P"ostio (primary P), heading, subtext, Google sign-in, privacy link
  - Pravý panel: `LoginVisual` komponenta s gradient hero + dashboard mock
  - Responsive: pravý panel hidden na mobile (`hidden sm:flex w-1/2`)
- `src/components/auth/login-visual.tsx` – nová komponenta:
  - Gradient hero background (purple → violet → pink)
  - Dashboard mock karta s animovanými stat bary (Framer Motion)
  - Floating karty: "Post scheduled" + "+24% engagement"
  - Jemný cross pattern overlay
- `src/components/auth/google-signin-button.tsx` – vylepšený styl:
  - `h-11 rounded-xl` vyšší tlačítko, větší border radius
  - `shadow-card` stín, dark mode podpora (`dark:bg-gray-900`)
  - `space-y-4` místo `space-y-3` pro lepší spacing

### Krok 29 – Cookie Consent redesign + Framer Motion typy (DOKONČENO)
**Hotovo:**
- `src/components/cookie-consent.tsx` – kompletní přepsání:
  - **Floating card** místo bottom baru: `fixed bottom-4 right-4`, `rounded-2xl`, `bg-card`, border + stín
  - Tlačítka: "Předvolby" (outline) + "Přijmout vše" (primary, flex-1)
  - **Dialog (Modal)** pro předvolby cookies se 3 kategoriemi:
    - Nezbytné (vždy ON, bez switch, badge `bg-primary/10`)
    - Analytika (Switch ON/OFF + label stavu)
    - Marketing (Switch ON/OFF + label stavu)
  - Každá kategorie v `rounded-xl border p-4` kartě s popisem
  - Tlačítko "Uložit předvolby" v patě dialogu
  - Install: `@radix-ui/react-dialog` + shadcn `dialog` + `switch` komponenty
- `src/messages/cs.json`, `en.json`, `uk.json` – nové cookie klíče:
  `preferences`, `preferencesTitle`, `preferencesIntro`, `necessary`, `necessaryDesc`,
  `analyticsDesc`, `marketingDesc`, `savePreferences`, `on`, `off`
- `src/components/auth/login-visual.tsx` – oprava Framer Motion v12 typů:
  - `ease: "easeInOut"` → `ease: "easeInOut" as const` (3 místa)
  - Bez `as const` hlásí TypeScript chybu při buildu (infernovaný `string` není kompatibilní s `Easing`)
- Build úspěšný

### Krok 31 – Scheduler: Edge Function + Vercel Cron + ECC Service Role auth (DOKONČENO)
**Hotovo:**
- `supabase/functions/process-scheduled-posts/index.ts` – Edge Function, která zpracuje `posts` se statusem `scheduled` a `scheduled_at <= now()`, přepne je na `published` a založí výchozí řádek v `analytics`
  - Autorizace přes `Authorization: Bearer` ověřená jako JWT s rolí `service_role` přes Supabase JWKS (ECC klíče)
 - Pozn.: Supabase CLI nepovoluje secrets s prefixem `SUPABASE_`, proto Edge Function čte DB klíč z `POSTIO_SERVICE_ROLE_KEY`
 - Repo hygiene: ignorování `supabase/.temp/` (lokální soubory Supabase CLI)
 - Cron auth kompatibilita: Edge Function bere `Authorization: Bearer` jak ve formátu JWT, tak i ve formátu `sb_secret_*` (porovnání proti `POSTIO_SERVICE_ROLE_KEY`)
 - Vercel Cron vypnut: odstraněn `vercel.json` a Next.js cron route (Vercel Hobby limity); spouštění řešeno přes Supabase Cron (pg_cron)
 - Fix deploy: `tsconfig.json` vylučuje `supabase/functions/**`, aby Next.js typecheck nepadal na Deno remote importe (esm.sh / npm:)
 - Fix: `middleware.ts` vyjímá `/icon` a `/apple-icon` z middleware matcheru, aby se favicon/ikony neredirectovaly na login
