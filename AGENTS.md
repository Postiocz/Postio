# Projekt: Postio (Social Media Content Planner)

## 🛠 Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Backend & Databáze:** Supabase
- **Autentizace:** Supabase Auth (Google OAuth + Email)

## 📐 Pravidla pro Claude Code
1. **Next.js pravidla:** 
   - Používej moderní přístup (Server Components). Pro klientskou interaktivitu nezapomeň na vrchol souboru přidat `"use client"`.
2. **Supabase pravidla:** 
   - Klientské a serverové dotazy dělej přes `@supabase/ssr`. 
   - Nepoužívej staré verze Supabase knihoven.
   - `auth.users` slouží pouze pro primární identitu (E-mail/Heslo). Sociální integrace ukládej výhradně do `public.social_accounts`.
3. **Pracovní postup:**
   - Než vytvoříš velké množství kódu, nejprve mi napiš krátký plán, co přesně půjdeš udělat.
   - Po úspěšném vyřešení složitého problému si zapiš ponaučení sem dolů do sekce "Ponaučení z chyb".
4. **CHANGELOG Zero-Token Auto-Drop:**
   - Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků.
   - Při přidání nového záznamu na začátek changelogu zkontroluj celkový počet záznamů. Pokud přesáhne 10, ten úplně nejstarší záznam ze dna souboru JEDNODUŠE SMAŽ.
   - Žádný archivní soubor neotevírej, nečti ani nevytvářej – stará historie zůstává v Git commit history a tím šetříme 100 % kontextových tokenů pro programování.

## 🚀 Časté příkazy
- Start vývojového serveru: `npm run dev` (dostupné na http://localhost:3000)

## 🎨 Standard Postio UI
- **Barevné schéma**: Pure Black (#000) pozadí, Card bg (#09090b s opacitou).
- **Radius**: Všude 20px (`rounded-[20px]`).
- **Efekty**: Glassmorphism, mřížka 24x24px, jemné glow gradienty.
- **Fonty**: Geist/Inter pro texty, stylizované Logo pro branding.
- **Design System Standard**: Pozadí #000, Radius 20px, Glassmorphism, Grid, Barevné logo.

## 📱 Sociální sítě – UI/UX & API pravidla (Bibla pravidel)

STRIKTNÍ PRAVIDLA – musí být dodržována vždy při práci s publishing a post management features.

### 1. Editace po publikování
- **Facebook:** Jediná platforma s editací textu. UI: tlačítko "Aktualizovat na sítích".
- **Instagram & LinkedIn:** Zákaz editace textu, ale **smazání je plně podporováno**. Místo tlačítka editace zobraz banner "Editace není platformou podporována".
- **TikTok:** Úplné uzamření po publikování. Žádná editace, žádné smazání. Zobraz ikonu zámku.
- **YouTube:** Plná podpora editace i smazání.
- **X (Twitter):** Zákaz editace přes API. Smazání je plně podporováno.

### 2. Validace médií
- **Instagram:** Pouze JPEG. Poměr stran 4:5 až 1.91:1. Varování předem při nesedícím poměru.

### 3. Tokeny
- Pole `token_expires_at` v `social_accounts`. Monitoruj expiraci (LinkedIn = 60 dní).

### 4. Specifika
- **LinkedIn:** Žádné PDF karusely. `@mention` = prostý text.
- **X (Twitter):** Free tier = jen write-only (publish a smazání), žádné čtení timeline.

## 🧠 Ponaučení z chyb (Paměť)
- *Zde bude Claude přidávat věci, které jsme už jednou pokazili a opravili, aby se neopakovaly.*
- **2026-06-15 – next-intl dynamické překlady**: Překlady obsahující ICU placeholdery (`{name}`, `{count}`, …) se v next-intl **musí volat s parametry** (`t("key", { name: "..." })`). Pokud je předáš jako holý `t("key")` a hodnotu dosazuješ později přes `String.replace`, next-intl při renderu/parsování vyhodí `FORMATTING_ERROR: The intl string context variable "X" was not provided`. Správný vzor pro decompované klientské komponenty: v props předej **funkci** `(value) => t("key", { X: value })` a v komponentě ji teprve zavolej s dynamickou hodnotou.
- **2026-06-20 – LinkedIn OAuth scope `r_member_social`**: LinkedIn developer app **nemá schválený produkt** `r_member_social` (čtení member sociálních dat), a proto celé OAuth authorizace končí chybou `unauthorized_scope_error` ještě před tím, než se uživatel dostane k consent obrazovce. **Řešení**: v `src/app/api/accounts/linkedin/route.ts` v OAuth authorize URL (`scope` query param) **nežádat** `r_member_social`. Pro publikování příspěvků stačí `openid profile email w_member_social`. Pravidlo: do OAuth scope přidávej **pouze** to, co reálně API volání potřebuje – každý nepoužívaný scope zvyšuje riziko, že OAuth selže kvůli neschválenému produktu v developer portálu.
- **2026-06-20 – LinkedIn UGC `distribution` NENÍ povolené pro member-autored posts**: Předchozí ponaučení tvrdilo opak – **šlo o chybný závěr z neověřené dokumentace**. Skutečnost (ověřená 2026-06-20 na produkci): LinkedIn API vrací `403 ACCESS_DENIED: Unpermitted fields present in REQUEST_BODY: Data Processing Exception while processing fields [/distribution]` pro jakýkoli ugcPost s `author: urn:li:person:*` + scope `w_member_social`. Blok `distribution` je povolený **POUZE pro organization-autored posts** (`urn:li:organization:*` + `w_organization_social` / Marketing Developer Platform). **Pro member-autored ugcPost správný payload je**: `{ author, lifecycleState: "PUBLISHED", specificContent, visibility }` – žádné `distribution`. **Pravidlo do budoucna**: při implementaci publish payloadu na sociální síti **vždy ověř na živém API nebo v oficiální API konzoli** (ne zastaralé tutorialy/Microsoft Learn archiv), že každé pole v requestu je pro daný scope a author typ povolené. „Mandatory field" tvrzení bez testu na živém API je vždy podezřelé – a v LinkedIn případě se navíc `distribution` chová přesně opačně (je zakázané pro member posts, ne povinné).
- **2026-06-20 – LinkedIn image binary upload: POST, ne PUT**: Podle oficiální dokumentace Share on LinkedIn (https://learn.microsoft.com/cs-cz/linkedin/consumer/integrations/self-serve/share-on-linkedin) se binární data obrázku/video posílají **POST** requestem na `uploadUrl` vrácenou z `POST /v2/assets?action=registerUpload`. Náš kód historicky posílal **PUT** – LinkedIn to tiše akceptoval (vrátil 201 Created, response vypadal úspěšně), ale binární data se reálně nepersistovala. Následný `POST /v2/ugcPosts` s asset URN ukazujícím na neexistující binární obsah vytvořil příspěvek bez obrázku (nebo v „review" frontě), takže na LinkedInu se nezobrazil. **Pravidlo pro binární upload na sociální sítě**: (1) **vždy ověř metodu v textové dokumentaci**, ne v cURL příkladu – `curl --upload-file` interně dělá PUT, ale dokumentace může explicitně říkat POST (a naopak); (2) **otestuj na živém API, že binární data skutečně dorazila** – nestačí ověřit 2xx response, je potřeba získat asset zpátky (pokud API podporuje read) a ověřit, že content odpovídá; (3) **v komentáři v kódu vždy cituj dokumentaci** pro daný krok, aby budoucí vývojář neudělal stejnou chybu (zvlášť když je dokumentace v jedné větě v rozporu s příkladem). Pro všechny ostatní sociální sítě platí totéž: Facebook Graph API binární upload (`/{ig-user-id}/media`) používá POST s `application/x-www-form-urlencoded` a `image_url`/`video_url` (nebo multipart), YouTube resumable upload používá PUT s binárním tělem – vždy ověřit pro danou síť.
- **2026-06-20 – „Member-autored post publikovaný v API, ale neviditelný na LinkedInu" – možné příčiny mimo kód Postio**: Pokud ugcPost projde s `201 Created` + URN, ale nezobrazí se na profilu/feedu, příčina **typicky není v Postio kódu**, ale v některém z těchto bodů (všechny jsou mimo naši kontrolu): (1) **LinkedIn processing delay** 5–15 min po prvním publikování, (2) **Developer app v „Development" módu** v LinkedIn Developer Portalu – API projde, ale posty se nezobrazují členům v produkci; řešení = přepnout app na „Live" a projít App Review, (3) **OpenID `sub` mismatch** – `account.platform_id` v `social_accounts` neodpovídá uživateli, jehož token byl použit; detekce = vizuálně ověřit URN `urn:li:person:{sub}` v logu oproti profilu, na který čekáme příspěvek, (4) **binární upload selhal tichým způsobem** – image post bez obrázku nebo v review frontě. Pravidlo: **pokud API vrátí 2xx a URN, post považujeme za úspěšně publikovaný** a diagnostiku „nevidím příspěvek" směřujeme na tyto čtyři body, ne na kód.
- **2026-06-20 – LinkedIn publish log `CM API not available` ≠ nepublikovaný post**: Log `[syncPublishedPosts] LinkedIn sync skipped: CM API not available for this app scope.` znamená pouze to, že **sync nemůže ověřit existenci** příspěvku na LinkedInu (chybí `r_member_social` scope, který CM API vyžaduje). **Neznamená**, že příspěvek nebyl publikován. Pokud sync hlásí "skipped", znamená to, že sync nedokáže potvrdit ani vyvrátit existenci – výchozí předpoklad je "post existuje, konzervativně `published`". Diagnostika publish vs. display problémů na LinkedInu musí vždy začít u **request payloadu a response URN**, ne u sync logiky.
- **2026-07-03 – TikTok Content Posting API: privacy a úspěch publish nelze hardcodovat**: Pro TikTok publish flow je **povinné nejdřív volat** `/v2/post/publish/creator_info/query/` a z odpovědi převzít `privacy_level_options` i capability flagy (`comment_disabled`, `duet_disabled`, `stitch_disabled`). `privacy_level` se nesmí hardcodovat bez ohledu na účet. Zároveň `video/init` + binární upload **neznamenají úspěšně publikované video** – finální úspěch je až po pollingu `/v2/post/publish/status/fetch/` do stavu `PUBLISH_COMPLETE`. Pravidlo: ve všech TikTok publish větvích (okamžité i scheduled) dělej sekvenci `creator_info/query -> init -> upload -> status/fetch polling`, a per-post privacy ukládej do `post_platforms.metadata.privacy_level`.
- **2026-07-04 – TikTok unaudited klient může vynutit `SELF_ONLY` i když UI nabízí víc možností**: Chyba `unaudited_client_can_only_post_to_private_accounts` znamená, že TikTok app ještě není auditovaná / je v omezeném režimu a veřejné ani friends-only publikování neprojde. Pravidlo: v TikTok publish flow nejdřív respektuj `creator_info/query`, ale přidej **pojistku**: v dev/sandbox režimu force `SELF_ONLY`, a pokud `video/init` vrátí tuto konkrétní chybu, automaticky udělej retry se `privacy_level: "SELF_ONLY"` místo finálního failu. Stejná pojistka musí být v app flow i v scheduled Edge Function, jinak se okamžité a naplánované publikování budou chovat odlišně.
- **2026-07-07 – Cross-user leak u `social_accounts`: vždy ověř live RLS, ne jen migrace v repu**: Pokud nový uživatel vidí cizí propojené účty nebo cizí progress na dashboardu, **nepředpokládej automaticky chybu v aplikačním filtru ani správně nasazené DB policies jen proto, že existují v migracích**. Nejdřív v live Supabase dashboardu ověř, že na `public.social_accounts` je skutečně zapnuté RLS a že neexistuje žádná široká/testing policy (např. `ALL`, `USING (true)`, apod.). Správný stav pro Postio: 4 samostatné policy pro `SELECT` / `INSERT` / `UPDATE` / `DELETE`, všechny s podmínkou `auth.uid() = user_id`. Defense-in-depth v kódu (`eq("user_id", user.id)` a serverové sanitizované endpointy) ponechat i po opravě live RLS.
