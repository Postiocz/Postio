# TikTok App Review – Scénář demo videa (CZ popis + EN titulky)

> **Účel**: Krok za krokem popis screencastu pro TikTok app-review tým. Ukazuje kompletní
> tok „Přihlášení → Připojení účtu → Výběr videa → Nastavení soukromí → Publikace",
> jak ho zažije reálný uživatel Postio.
>
> **App**: Postio (postio-app.cz) – webový plánovač obsahu na sociální sítě.
> **Jazyk nahrávky**: Angličtina (`en`). UI je dostupné i v češtině (výchozí) a ukrajinštině;
> před nahráváním vyber angličtinu přepínačem vpravo nahoře.
> **Titulky**: EN verze je v `docs/tiktok-review-captions-en.srt` (časové kódy odpovídají
> délkám scén níže).

---

# PŘÍPRAVA PŘED NATÁČENÍM

> Udělej **alespoň den předem**. TikTok u neauditované aplikace (sandbox) povolí publikaci
> na soukromé účty – testovací TikTok účet proto MUSÍ být nastaven jako **soukromý**
> (TikTok app → Settings → Privacy). Ověřeno v sandboxu na soukromém účtu (Scene 5).

- [ ] **Doména**: natáčej na **`https://postio-app.cz`** (ne na localhostu) – doména webu
      v nahrávce MUSÍ odpovídat URL v review (App Review Guidelines).
- [ ] **Sandbox klíče ve Vercelu**: ve Vercelu (produkční doména) musí být nastavené
      **sandbox `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`**, pokud natáčíme před
      schválením appky.
- [ ] **Testovací TikTok účet** nastavený jako **soukromý** a přihlášený (Scene 6).
- [ ] **Postio testovací účet** (`@postio-app.cz` doména nebo admin) – Launch Guard odemyká
      TikTok/FB/IG jen pro admin a `@postio-app.cz` účty. Přihlas se **před** nahráváním,
      ať je Scene 1 rychlá.
- [ ] **Krátký neutrální `.mp4` klip** (pár sekund, bez hudby/vodoznaku; formáty
      mp4 / mov / m4v / webm / mkv).
- [ ] **EN locale** (`/en/...`) nastavena; **Lokace a tagy v editoru prázdné** (štítek
      „Lokace" je v UI česky – ať není vidět v nahrávce).
- [ ] **Prohlížeč**: desktop, angličtina, stabilní kurzor, zoom 100 %, **oříznutý taskbar**.
- [ ] **Bez tajemství na obrazovce**: žádné access tokeny, žádné konzolové logy.

---

## Scene 0 — Overview (10 s)

- Celá obrazovka Postio **Dashboardu** (desktop, landscape).
- Titulek: „Postio — schedule and publish videos to TikTok together with other networks."

---

## Scene 1 — Log in (30 s)

1. Jdi na `https://postio-app.cz` → appka přesměruje na **Sign in** (split layout: forma
   vlevo, vizuální panel vpravo).
2. Přihlas se e-mailem + heslem (demo přihlašovací údaje ze submission notes) nebo Google OAuth.
3. Otevře se **Dashboard**. Titulek:
   „This account is pre-authorized for the TikTok sandbox (BETA reviewer access)."
4. Přepni locale switcher na **English**, pokud není.

> UI poznámka: TikTok/Facebook/Instagram jsou sandbox platformy za **Launch Guardem**.
> Odemykají se jen pro admin účty nebo účty na doméně `@postio-app.cz`, což je přesně
> reviewer účet. Běžní (neprivilegovaní) uživatelé místo toho vidí BETA badge a
> zakázané tlačítko Connect.

---

## Scene 2 — Connect the TikTok account (40 s)

1. Otevři **Accounts** v sidebaru (`/en/accounts`).
2. Najdi kartu **TikTok**. Nemá BETA zámek (Launch Guard prošel).
3. Klikni **Connect** → appka otevře oficiální TikTok consent obrazovku
   (`www.tiktok.com/v2/auth/authorize`) se scopes:
   - `user.info.basic` (profil)
   - `video.upload` (nahrání videa)
   - `video.publish` (publikace videa)
   - **Podrž consent obrazovku na obrazovce ≥ 5 s**, ať jsou vidět zatržené scopes.
4. Na TikTok obrazovce vyber TikTok účet, zkontroluj vyžádaná oprávnění, uděl souhlas
   a vrať se. Appka tě vrátí na **Accounts**.
5. TikTok karta teď ukazuje připojený účet: jméno, avatar a „connected" potvrzovací toast.
   Titulek: „The OAuth exchange (PKCE + code) is handled by `/api/accounts/tiktok`
   server-side; the access token is kept server-side and refreshed automatically."

---

## Scene 3 — Create a post and select a video (45 s)

1. Jdi na **Posts → New Post** (`/en/posts/new`).
2. Napiš titulek, např. „TikTok review demo".
3. Otevři **media picker** a přidej krátký **.mp4** soubor
   (podporováno: mp4 / mov / m4v / webm / mkv).
   - Dokud se soubor nahrává, media tile ukazuje stav průběhu.
4. V platform/account pickeru vyber připojený **TikTok** účet.
   - UI vyžaduje video, kdykoli je vybrán TikTok; tlačítko **Publish Now** je
     zakázané, dokud není hotový upload videa.
   Titulek: „Video is uploaded to Postio storage first; TikTok receives it via the
   Content Posting API at publish time."

---

## Scene 4 — Set privacy and video options (40 s)

1. Editor odhalí panel TikTok **Direct Post** pro vybraný účet:
   - **Video visibility** (select „Select visibility…"): nabízí **Followers**,
     **Friends** a **Only me**. **Public se pro tento účet nenabízí** (creator_info
     nevrátil `PUBLIC_TO_EVERYONE`). **Nic není předvybráno** – select je prázdný
     s placeholderem.
2. Uživatel **aktivně vybere Only me** (takový výběr umožňuje publikaci i v sandboxu).
   Titulek: „The visibility dropdown follows the creator's `privacy_level_options`
   from the TikTok API; nothing is pre-selected."
3. Pod ním se zobrazí:
   - **Interakce**: Allow comments (nezaškrtnutá), **Allow duet a Allow stitch jsou
     šedé** („unavailable for this account" – tvůrce je zakázal v `creator_info`).
   - **Maximální délka videa: 600 s** (z `max_video_post_duration_sec`).
4. **Commercial content** toggle je ve výchozím stavu **vypnutý** (ukázat tak, jak je).
   Na kameře toggle **zapni** – objeví se dvě volby: **Brand Organic** („Promoting
   myself/my business" – „Promotional content") a **Branded Content** („Promoting
   another brand" – „Paid partnership"). Zaškrtni **jen** „Promoting myself/my
   business" (Brand Organic). **Branded Content na kameře nezaškrtávej** (zrušilo by
   to volbu **Only me**) a **toggle před publikací nevypínej**. **Branded Content**
   vyžaduje ne-soukromou viditelnost: u účtu s volbami **Followers/Friends** je
   zaškrtnutelný a zakáže se jen **Only me** s hintem „Branded content visibility
   cannot be set to private."; celá volba je zakázaná jen u účtu, jehož jedinou
   možností viditelnosti je **Only me**.
   Titulek: „Commercial content disclosure is off by default; the user turns it on and
   selects "Promoting myself/my business" (Brand Organic)."
5. **Music Usage Confirmation** checkbox těsně před publish – zaškrtni ho (odkaz na
   oficiální pravidla TikToku). Pro Brand Organic zůstává popisek **Music Usage
   Confirmation** (checkbox Branded Content Policy se přidává jen při Branded Content).
6. Pod formulářem text: zpracování může trvat **pár minut**, než se objeví na profilu.
   Titulek: „All Direct Post requirements are exposed: explicit visibility choice,
   interaction toggles, disclosure and consent."

---

## Scene 5 — Publish (50 s)

1. **Publish Now** je v sekci **Time and publish** (vpravo dole, vedle **Schedule**
   a **Add to Queue**). Klikni tlačítko (aktivní, protože všechny podmínky jsou splněné).
2. Tlačítko ukazuje **„Saving…"**.
3. Server spustí kompletní Content Posting sekvenci:
   - `POST /v2/post/publish/creator_info/query/`
   - `POST /v2/post/publish/video/init/` → získá `publish_id` + `upload_url`
   - binární nahrání videa (`PUT` na `upload_url`)
   - `POST /v2/post/publish/status/fetch/` → polluje každých 2,5 s, dokud nevrátí
     `PUBLISH_COMPLETE` (až 3 minuty).
4. Appka **přesměruje na Posts**, zobrazí toast **„Your post was published successfully"**
   a karta postu má štítek **Published**.
   Titulek: „End-to-end posting to TikTok; no manual steps beyond the form."

> **Kdy se post označí Published** (z kódu): `post_platforms.status = "published"` nastaví
> `handlePublishSuccess` v `publish.ts`, které se volá **jen po tom**, jak
> `publishToTikTokAction` vrátí success – a ten přichází **jen po `PUBLISH_COMPLETE`** od
> TikTok `status/fetch` (`waitForTikTokPublishComplete` v `publish-tiktok.ts`). Takže
> Published štítek se **nikdy neobjeví dřív**, než TikTok potvrdí publikaci. Pokud TikTok
> vrátí `FAILED` nebo timeout, post zůstane v chybě a štítek se neobjeví.

> **Sandbox poznámka**: se zvoleným **Only me** (SELF_ONLY) banner
> `unaudited_client_can_only_post_to_private_accounts` se **neobjevuje** – TikTok publikaci
> přijal rovnou. **Friends a Followers jsme na tomto účtu netestovali** – jestli by se
> banner objevil u nich, není zjištěno; ověř ručně, jestli chceš být jistý.
>
> **Poznámka pro submission**: publikace v nahrávce používá **Brand Organic** (propagace
> vlastního podnikání uživatele); video nese TikTok štítek „Promotional content".
> **Branded Content (paid partnership) se nedemonstruje**: per TikTok's Content Sharing
> Guidelines an unaudited client can only post with SELF_ONLY visibility and Branded
> Content cannot be private.

---

## Scene 6 — Verification (40 s)

1. **Druhá záložka prohlížeče na `tiktok.com` je otevřená předem** a přihlášená na
   soukromý testovací účet.
2. V Postio otevři publikovaný post z **Posts** → edit dialog → TikTok tab.
   - Zobrazuje vložený mobile-like TikTok náhled (video + nickname + avatar + caption).
   - Lock banner: „Postio blocks editing of the published TikTok post; removal is
     handled separately (Scene 6B)".
3. **Živý důkaz** na TikToku: přepni se do záložky `tiktok.com` → otevři **Profil**
   vlevo → záložka **Videa** (samostatná „soukromá záložka" neexistuje).
   - Soukromá videa mají **ikonu zámku**; účet má **zámek vedle jména**.
   - Po otevření videa je štítek **„Private"** se zámkem **a štítek „Promotional
     content"** (video bylo publikované jako Brand Organic).
   - **TODO – ověřit ručně na EN TikToku**: **po jaké době** se video objeví na
     tiktok.com (text v UI říká, že zpracování může trvat **pár minut** – počkej
     a aktualizuj. **Nic nevymýšlej**, dokud není ověřeno).
   Titulek: „The video reached the connected TikTok account on tiktok.com."

> ⚠️ **KRITICKÉ MÍSTO**: TikTok účet je **soukromý** – video se nenajde ve veřejném feedu.
> Nenatáčej scénu, která by naznačovala veřejné zobrazení. Počkej na zpracování (pár minut),
> než hledáš video.

---

## Scene 6B — Delete after publishing (soft-archive) (25 s)

> Samostatná scéna, protože **TikTok dokumentace neuvádí endpoint pro programové smazání
> videa** (Content Posting API / Content Sharing Guidelines nemají delete pro videa).
> Appka proto nevolá API DELETE – místo toho uživatele vyzve k ručnímu smazání
> a TikTok řádek archivuje (soft-archive).

1. V edit dialogu (nebo v menu karty postu) klikni **Delete/Remove** a potvrď.
2. Appka zobrazí **toast/banner**: TikTok API nepodporuje smazání → uživatel musí video
   smazat **manuálně na TikToku**.
3. TikTok řádek se archivuje (`status: archived`, `archive_reason: user_removed_manually`),
   karta postu zůstává, ale TikTok ikona je **šedá**.
   Titulek: „TikTok's API does not support deleting videos programmatically. Postio asks
   the user to remove the video manually and archives the TikTok row (greyed-out icon)."

> ⚠️ **KRITICKÉ MÍSTO**: tato scéna **musí proběhnout bez chybové obrazovky** – musí se
> zobrazit přátelský toast/banner o ručním smazání, ne tvrdá chyba. Žádný error toast
> neplatní nahrávku.

---

## Scene 7 — Wrap-up (10 s)

- Freeze-frame TikTok karty v Accounts s připojeným účtem.
- Titulek: „Thank you for reviewing Postio. Any questions: hello@postio-app.cz"

---

## Checklist pro nahrávání

- [ ] Nahrává se na **`https://postio-app.cz`** (doména = URL v review), **ne localhost**
- [ ] Ve Vercelu nastavené **sandbox `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`**
- [ ] Anglická locale (`/en/...`) vybraná; **Lokace a tagy prázdné**
- [ ] Testovací TikTok účet **soukromý**, **přepnutý na angličtinu**, a přihlášený;
      **tiktok.com záložka otevřená předem**
- [ ] TikTok consent obrazovka viditelná ≥ 5 s **se zatrženými scopes** (Scene 2)
- [ ] **Commercial content**: zapnout, vybrat jen Brand Organic, Branded Content
      nezaškrtávat, toggle před publikací nevypínat
- [ ] Krátký **neutrální** `.mp4` klip (bez hudby/vodoznaku, **ne AI scéna s postavou**)
- [ ] `@postio-app.cz` reviewer účet použitý (Launch Guard unlock)
- [ ] Scene 5 a 6B bez chybové obrazovky
- [ ] **Skrytá lišta záložek** prohlížeče; **oříznutý taskbar**; žádné tajemství na
      obrazovce (žádné tokeny, žádné konzolové logy)
- [ ] 1080p nebo vyšší, 16:9, stabilní kurzor, 100% zoom
- [ ] Po nahrání doplnit `[MM:SS]` časy do tabulky submission notes (viz níže)

---

## Mapování scope → scéna → čas (pro submission notes)

| Scope | Scéna | Čas |
|---|---|---|
| `user.info.basic` | Scene 2 – Connect (consent + profil) | `[MM:SS]` |
| `video.upload` | Scene 5 – Publish (upload leg) | `[MM:SS]` |
| `video.publish` | Scene 5 – Publish (status/fetch → PUBLISH_COMPLETE) | `[MM:SS]` |
| (bez scope – delete) | Scene 6B – soft-archive + ruční smazání | `[MM:SS]` |