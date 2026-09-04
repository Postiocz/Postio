# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🎁 Prompt 064/066 – Stupňovité odměny za doporučení (7/10/14 dní) ✅

- **Kontext**: Referral odměny přešly na stupňovitý systém úměrný délce odměny (1 měsíc = 30 dní = plný Creator balíček 10 AI + 10 X). Bonus za nákup se v produkci neuděloval, protože webhook běžel na starém kódu bez této logiky.
- **Změny**:
  - ✅ `src/lib/referral.ts`: `rewardReferrer` (+7 dní + 2 AI + 2 X za registraci) a `rewardPurchaseBonus` (+10/3/3 za koupi Creatoru, +14/5/5 za koupi Pro) – idempotence přes `purchase_bonus_granted`.
  - ✅ `src/app/api/webhooks/stripe/route.ts`: `checkout.session.completed` nově čte `referred_by` kupujícího a volá `rewardPurchaseBonus`.
  - ✅ `usage-dashboard.tsx` + migrace `058_add_referral_reward_days.sql`: widget „Aktuální čerpání“ počítá limity úměrně délce odměny (7→2/2, 10→3/3, 14→5/5) a oprava „Zbývá × z Y“, aby se neukázalo „zbývá > celkem“ u stacked odměn.
  - ✅ Lokalizace cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Lokální replay webhooku – referrer `06696fdd` +14 dní, kupující `cba18fd` flagnutý `purchase_bonus_granted=true`. Produkce: uživatelem potvrzeno – registrace +7 dní a nákup Pro +14 dní + kredity se připsaly správně; fix widgetu nasazen (commit `0c4f19e`).

### Oprava referral bonusu +14 dní za nákup a widgetu „Aktuální čerpání“ ✅

- **Kontext 1**: Bonus +14 dní PRO za zakoupení plánu Creator se nepřipsal.
- **Kontext 2**: Sekce „Aktuální čerpání“ na Fakturaci ukazovala neplatné limity (Free 0/0/1) u uživatelů s odměnou PRO z doporučení.
- **Změny**:
  - ✅ `src/app/api/webhooks/stripe/route.ts`: Po `checkout.session.completed` se nově čte `referred_by` kupujícího a volá `rewardPurchaseBonus` (+14 za Creator, +30 za Pro). Bonus blok byl dosud jen v pracovním stromě (necommitnutný), proto se v produkci neudělil – nyní je commitnutý.
  - ✅ `src/app/[locale]/(dashboard)/settings/billing/usage-dashboard.tsx`: Řešení limitů sjednoceno s fakturační stránkou – vázaná Free master instance z registrace se bere jako „žádný nákup“ a limity se resolve podle `users.plan`; kouplená placená instance si drží vlastní limity.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Live data backfill: referrer `06696fdd` expiry → 2026-09-24 (+14 dní), kupující `2c0e4d36` `purchase_bonus_granted=true` (idempotentní). Manuálně potvrzeno uživatelem.


### 🐛 Fix – Návrat tlačítka "Zobrazit na síti" pro TikTok Sandbox ✅

- **Kontext**: Předchozí fix (zrušení fallbacku na `publish_id`) byl příliš striktní – v Sandboxu TikTok nevrací `publicaly_available_post_id`, takže tlačítko zmizelo úplně. Pro App Review ale musí být vždy dostupné.
- **Změny**:
  - ✅ `src/lib/live-url.ts`: nová `buildLiveUrlInfo()` vrací `{ url, profileFallback }` – TikTok bez `external_id` (nebo s legacy `v_pub_...` ID) odkazuje na profil `https://www.tiktok.com/@{username}`. `buildLiveUrl()` zůstává jako wrapper.
  - ✅ `src/lib/actions/publish-tiktok.ts`: status/fetch nyní fallbackuje na `video_id` z odpovědi, pokud `publicaly_available_post_id` chybí (sandbox) – ID se i tak persistuje.
  - ✅ `preview-dialog.tsx` + `edit-post-dialog.tsx`: tlačítko se zobrazuje vždy pro published platformy; při `profileFallback` pod ním info text "V Sandbox režimu odkazujeme na profil…".
  - ✅ `preview-dialog.tsx`: oprava skutečné příčiny chybějícího tlačítka v náhledech – `PostCard` ani `Calendar` nepředávaly prop `userId`, takže `loadProfiles` se vůbec nespustil → TikTok handle nebyl nikdy k dispozici → `buildLiveUrlInfo` vrátil null. Dialog si nyní sám dořeší uživatele ze `supabase.auth.getUser()` (stejně jako EditPostDialog).
  - ✅ `messages/{cs,en,uk}.json`: nový klíč `tiktokSandboxProfileHint` (v bloku `posts`, kde ho obě komponenty resolvují).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), JSON validní, dev server kompiluje bez chyb (starý syntax error v logu byl z přerušené editace; po vyčištění `.next` cache čisté).

### 🐛 Fix – TikTok "Zobrazit na síti" otevíral neplatnou URL ✅

- **Kontext**: Tlačítko "Zobrazit na síti" u TikTok postů otevíralo `tiktok.com/@user/video/v_pub_file...` – do `external_id` se ukládal dočasný `publish_id`, když TikTok nevrátil veřejné ID, a UI sestavovalo URL s tvrdě nakódovaným `@user`.
- **Změny**:
  - ✅ `src/lib/actions/publish-tiktok.ts`: zrušen fallback `externalId = publicPostId ?? publishId`; ukládá se jen skutečné `publicaly_available_post_id`. Typ `TikTokPublishActionResult.externalId` nyní `string | null` (null pro soukromá/sandbox videa – odkaz se pak nekreslí).
  - ✅ `src/lib/actions/publish.ts`: `handlePublishSuccess` akceptuje `string | null`; obě volání TikTok akceptují `null` a do DB zapíšou `null` místo prázdného řetězce.
  - ✅ Nový `src/lib/live-url.ts` – jediný zdroj pravdy `buildLiveUrl(platform, externalId, { tiktokUsername })` → TikTok: `https://www.tiktok.com/@{username}/video/{external_id}` (bez username vrátí null, never fabricates @user). Instagram: zachováno parsování `shortcode|media_id`.
  - ✅ `src/components/preview-dialog.tsx` (Náhled z Posts i Calendar): resolver `resolveTikTokUsername` načítá handle z `meta_data.creator_info_cache.creator_username` (fallback `account_name`), předán do `buildLiveUrl`.
  - ✅ `src/components/edit-post-dialog.tsx`: sdílený `buildLiveUrl` + state/effect `tiktokUsername` (načte handle ze `social_accounts` při otevření).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Zámek 🔒 a zakázaná editace pro publikované TikTok posty zůstávají v obou sekcích (PreviewDialog nemá editační pole, `isTikTokPublished` banner s Lock nezměněn).

### 🎬 Prompt 062 – KROK 3: Oprava TikTok panelu v editoru nového příspěvku ✅

- **Kontext**: Po výběru TikTok účtu se v editoru nového příspěvku nezobrazoval panel "Nastavení soukromí / Možnosti videa" a v konzoli byly chyby `MISSING_MESSAGE` pro klíče `posts.tiktokPrivacy*`.
- **Změny**:
  - ✅ `src/app/[locale]/(dashboard)/posts/new/page.tsx`: kompletní TikTok infra – state (`tiktokCreatorInfo`, `tiktokPrivacyLevel`), `hasTikTokIntent` memo, best-effort fetch `creator_info` přes `getTikTokCreatorInfoAction`, `platformMetadata` (#tiktok privacy) předán do všech 3 volání `createPostAction` (draft/scheduled, publish now, queue). Přidán prémiový Glassmorphism panel (3 privacy toggle + sandbox varování s `Info` ikonou + box s možnostmi účtu) mezi výběr platforem a pole Lokalita.
  - ✅ `src/messages/{cs,en,uk}.json`: 12 TikTok klíčů (`tiktokPrivacyTitle`, `tiktokPrivacyHint`, …) přesunuto z bloku `calendar` do bloku `posts` – editor je resolvuje pod namespace `posts`, proto měly `MISSING_MESSAGE` error (uk měl v `posts` částečně jen `tiktokPrivacyTitle`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), JSON validní ve všech 3 jazycích. Manuálně potvrzeno uživatelem (panel se zobrazuje bez MISSING errorů).

### 🚀 Prompt 065 – ÚKOL G: Vyčištění notifikačních teček + indikátor tarifu v záhlaví ✅

- **Kontext**: Pro uživatele s tarifem Pro jsou fialové tečky (novinka u "Nastavení", tečka u "Upgrade plánu") bezpředmětné; záhlaví Dashboardu neukazovalo aktuální tarif.
- **Změny**:
  - ✅ `sidebar.tsx` + `feedback-sidebar-wrapper.tsx` + `layout.tsx`: nová prop `currentPlan` (select `plan` z `users`) – pro tarif `pro` se skryje indikační tečka u "Nastavení" i tečka u "Upgrade plánu".
  - ✅ `dashboard/page.tsx`: prémiový Glassmorphism badge v záhlaví vedle nadpisu – Crown (Pro) / Zap (Creator) / Sparkles (Free) + lokalizovaný název tarifu (reuse klíčů `dashboard.free`/`planCreator`/`planPro`), tlumené barvy, `flex-wrap` pro mobil.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (tečky u Pro zmizely, indikátor Pro v záhlaví vypadá prémiově).

### 🚀 Prompt 065 – ÚKOL F: Inteligentní viditelnost Upgrade banneru ✅

- **Kontext**: Uživatel s tarifem Pro viděl banner "Upgrade na Pro", který je pro něj bezpředmětný.
- **Změny**:
  - ✅ `dashboard/page.tsx` (`UpgradeBanner`): early return `null` při `currentPlan === "pro"` – banner se pro Pro uživatele nevykresluje vůbec; pro Creator/Free zůstává viditelný. Zjednodušen `planLabel` (jen `planCreator`/`free`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (Pro – banner skryt, Creator/Free – viditelný).

### 🎬 Prompt 065 – Dashboardová operace (ÚKOLY B + C + D + E) ✅

- **Kontext**: Prázdný dashboard se schovával do samotného checklistu a skrýval mřížku statistik; inline `OnboardingChecklist` duplicitně konkuroval plovoucímu `SetupGuide`.
- **Změny**:
  - ✅ `welcome-section.tsx` (nová): dvě prémiové Glassmorphism karty uprostřed prázdného dashboardu. Krok 1 "Propojte své sítě" = aktivní link na `/accounts` (indigo glow, ikony sítí, CTA s `ArrowRight`); Krok 2 "Vytvořte první příspěvek" = uzamčená (`Lock`, `opacity-60`), odemyká se po propojení první sítě.
  - ✅ `dashboard/page.tsx`: prázdný stav teď zachovává title + mřížku statistik se 4 `StatSkeleton` ghost kartami, vkládá Welcome sekci pod stats grid; analytics row a quick actions při prázdném stavu skryté; `UpgradeBanner` + `PreviewDialog` vždy. Odebrán import i inline `OnboardingChecklist`.
  - ✅ Smazán `onboarding-checklist.tsx` (mrtvý kód); jediný průvodce = plovoucí `SetupGuide` (layout.tsx), bez duplicity.
  - ✅ Lokalizace cs/en/uk: nové `welcomeStep1*`/`welcomeStep2*` klíče (dashboard), odstraněny nepoužívané `onboarding*`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (prázdný účet: ghost stats + Welcome sekce + SetupGuide v rohu, bez duplicity).

### 🚀 Prompt 065 – ÚKOL A: Fixace logiky "Aktuální tarif" ✅

- **Kontext**: Ceník na Fakturaci mohl označit kartu Free jako "Aktuální", i když uživatel platil za Creator/Pro, a badge se mohl objevit na více kartách najednou.
- **Změny**:
  - ✅ `src/app/[locale]/(dashboard)/settings/billing/page.tsx`: nová detekce `userHasPaidPlan` (podle `users.plan` nebo navázané ne-free instance `current_plan_instance_id`). Karta Free je "Aktuální" JEN když `!userHasPaidPlan`; placené master karty (Creator/Pro) se řídí `userPlan === planType || master.id === currentPlanInstanceId`. Výsledkem je maximálně 1 badge "Aktuální" v celém ceníku, respektující skutečný tarif (i když `current_plan_instance_id` zaostává a ukazuje free vazbu z registrace).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (fajfka jen u aktivního plat tarifu, u Free zmizela; i pro případ `plan="pro"` se zastaralou free instancí).

### 🎬 Prompt 062 – KROK 1: TikTok Video Scénář (App Review) ✅

- **Kontext**: TikTok vyžaduje pro opuštění sandboxu demo video s propojením účtu, výběrem videa, nastavením soukromí a publikací.
- **Změny**:
  - ✅ Nová složka `docs/` a soubor `docs/tiktok-review-script.md` – 8scénový anglický screencast scénář (login → connect OAuth → výběr videa → privacy → publish → verifikace → wrap-up) s kontrolním checklistem.
  - ✅ Scénář vychází z reálného chování aplikace: PKCE OAuth přes `/api/accounts/tiktok`, Content Posting sekvence (creator_info → init → upload → status/fetch), privacy `PUBLIC_TO_EVERYONE` default, sandbox fallback na `SELF_ONLY` a Launch Guard pro `@postio-app.cz`.
- **Ověření**: Scénář manuálně prostudován a potvrzen uživatelem (odpovídá reálnému chování aplikace).
