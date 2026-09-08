# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🎨 Prompt 068 – KROK 1-3: Dynamický čip Fronty + odkaz do nastavení rozvrhu + kontrast Light ✅

- **Kontext**: Čip Fronty (CalendarClock) v Quick slotech `/posts/new` ukazoval jen statický text „Fronta (příští volný slot)" + čas; aktivní čip šlo odznačit jen kliknutím na jiný čip. Chyběl rychlý přístup k nastavení rozvrhu.
- **Změny** (`schedule-quick-slots.tsx`, `posts/new/page.tsx`, messages cs/en/uk):
  - ✅ Dynamický text čipu Fronty: místo statického `labels.queue` zobrazuje i DEN odvozený z `queueAt` ISO (user timezone) přes novou funkci `fmtDay` – „Dnes · 09:00" / „Zítra · 09:00" / zkrácený název dne (Po, Tue, пн) lokálně dle locale. Nové i18n klíče `quickSlotWordToday`/`quickSlotWordTomorrow`.
  - ✅ Toggle odznačení: klik na aktivní čip vymaže `scheduledAt` (`onSelect("")`) – čip se odznačí a deaktivuje Schedule; konzistentně pro všechny 3 čipy.
  - ✅ Rychlý odkaz do nastavení rozvrhu: v hlavičce sekce „Čas a publikace" (ml-auto vpravo) ikona `Settings` v Radix tooltipu, `Link` na `/{locale}/settings/preferences`, i18n `editSchedule` (cs/en/uk), `aria-label`.
  - ✅ Kontrast Light: aktivní chip text `text-indigo-300`→`text-indigo-700` (~2.3:1→~5.5:1, WCAG AA), dark `text-indigo-200` zachován; neaktivní chip `text-slate-700`, link `text-slate-500 hover:text-indigo-600` – dle manuálů.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (čipy + odkaz + Light/Dark).

### 🎨 Prompt 069 – KROK 5: Kontrast captionu + Final polish ✅

- **Kontext**: Po KROKU 1–4 mají všechny platformy Light skiny; zbývalo doladit čitelnost captionu a jednotných mikro-detailů v live preview.
- **Změny** (`post-preview.tsx`):
  - ✅ Kontrastní audit napříč 6 platformami (Light + Dark): primární texty `#0f0f0f`–`#050505` na bílých kartách (~15–20:1), sekundární `#536471`/`#606060`/`#666`/`#65676b` čitelné, `--muted-foreground` ≈ AA – žádný kódový edit nebyl nutný.
  - ✅ TikTok overlay nad médiem sjednocen na vždy bílý text/ikony + tmavý scrim (`from-black/80 via-black/20 to-transparent`), nezávisle na tématu (lépe čitelné na videu); v empty stavu zůstává adaptivní dle tématu.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (všech 6 platforem, Light + Dark, bez refresh).

### 🎨 Prompt 067 – KROK 5: i18n a Final Polish ✅

- **Kontext**: Dle 📌 POZNÁMKY se KROK 5 Promptu 067 dokončuje spolu s dokončením Promptu 069 – sjednocení live preview se týká i editoru a edit dialogu.
- **Změny**:
  - ✅ Sjednocení náhledu (Live Preview) s Light modem finální: editor `/posts/new` i `EditPostDialog` zobrazují identický `PostPreview` s plnými Light/Dark skiny všech 6 platforem.
  - ✅ i18n konzistence: nové/přepsané klíče v cs/en/uk validní, žádný `MISSING_MESSAGE`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem.

### 🎨 Prompt 069 – KROK 4: Light skiny TikTok + X + MediaArea ✅

- **Kontext**: Po KROKU 3 (YT/LI) zůstávaly TikTok a X karty v Light modu tmavé; prázdný stav médií byl poblýsknutý.
- **Změny** (`post-preview.tsx`):
  - ✅ TikTok: light = světlá simulace (`bg-white` + text `#0f0f0f`), placeholder `bg-slate-100`, overlay gradient v light zesvětlen (`from-white/90 via-white/30`) aby texty zůstaly čitelné nad videem → dark zachován (`bg-black` / `from-black/80`).
  - ✅ X (Twitter): light = reálná X paleta (`bg-white` + text `#0f1419`, sekundární `#536471`, bordery `#e1e8ed`) → dark zachován (`#e7e9ea` / `#71767b` / `#2f3336`).
  - ✅ MediaArea: empty state light `bg-slate-100 text-slate-500`, media kontejner light `bg-white` (dark zachovány). Avatar: gradient indigo→purple + bílé písmo funguje v obou režimech, úprava netřeba.
  - 🐛 Bonus fix: chybějící `]` v `text-[#e7e9ea>` u Views count v X (statistika dědila špatnou barvu) – opraveno a vloženo do light varianty.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark pro obě platformy).

### 🎨 Prompt 069 – KROK 3: Light skiny YouTube + LinkedIn ✅

- **Kontext**: Po KROKU 2 (FB/IG) zůstávaly YouTube a LinkedIn karty v Light modu tmavé.
- **Změny** (`post-preview.tsx`):
  - ✅ YouTube: light = `bg-white` + text `#0f0f0f`, sekundární `#606060`, popisný chip `bg-slate-100` → dark zachován (`bg-[#0f0f0f]` / `text-white`). Červené tlačítko Subscribe drží v obou režimech (věrně realitě YT).
  - ✅ LinkedIn: light = reálný světlý LI (`bg-[#f3f2ef]`, karta `bg-white`, text `#191919`, sekundární `#666`, divider `border-black/10`, media rám `bg-white`) → dark zachován (`#1a1a2e` / `#1e1e36` / `#e4e6eb` / `#b0b3b8`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark pro obě platformy).

### 🎨 Prompt 069 – KROK 2: Light skiny Facebook + Instagram ✅

- **Kontext**: Po KROKU 1 panel Live Preview v Light modu „sedí" (Milky Glass), ale vnitřní karty sociálních sítí zůstávaly vždy tmavé.
- **Změny** (`post-preview.tsx`):
  - ✅ Facebook: light = skutečný světlý FB feed (pozadí `#f0f2f5`, karta `bg-white`, text `#050505`, sekundární `#65676b`, divider `border-black/10`, hover akcí `bg-black/5`) → dark zachován (`#242526` / `#18191a` / `#e4e6eb` / `#b0b3b8`).
  - ✅ Instagram: light = `bg-white` + text `#262626`, avatar mezikruží `bg-white`, caption hint `#8e8e8e` → dark `bg-black` + `text-white` zachován. Gradient ring `#F58529→#DD2A7B→#8134AF` drží v obou režimech.
  - ✅ Shodné třídy s jinými platformami (LinkedIn jméno, TikTok root) vyčleněny přes okolní kontext – KROK 3 a 4.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark).

### 🎨 Prompt 069 – KROK 1: Adaptivní kontejner Live Preview (Light mode) ✅

- **Kontext**: Levá strana editoru už v Light modu funguje (Milky Glass), ale pravý panel Live Preview zůstával vždy tmavý – vizuální nesoulad.
- **Změny** (`post-preview.tsx`):
  - ✅ Adaptivní kontejner panelu: light = Milky Glass (`bg-white/40 backdrop-blur-xl border-l border-slate-200`), dark = černé sklo (`bg-black/40 border-white/10`) – přesně dle zadání.
  - ✅ Nadpis „Náhled": light `text-slate-900`, dark zachováno `text-muted-foreground/80`.
  - ✅ Rám „telefonu": light `bg-white border-slate-200`, dark `bg-black border-white/5`.
  - ✅ Segmentovaný přepínač platforem: light `bg-white/70 border-slate-200`, dark zachováno.
  - ✅ Aktivní tab: zrušen inline `color: accent` (TikTok cyan by na bílém byl nečitelný), text `text-slate-900 dark:text-white`, barevný podtón accentu (`${accent}22`) zachován – brand identita drží v obou režimech.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark přepnutí bez refresh). Vnitřní karty sítí (FB/IG/YT/LI/TikTok/X) zatím stále tmavé – KROK 2–4.

### 🎨 Prompt 067 – KROK 4: Animace a mikro-interakce (Framer Motion) ✅

- **Kontext**: Editor a preview po KROKU 1-3 byly statické – přepínání platforem, zobrazování TikTok panelu i klikání na tlačítka probíhalo bez animovaného feedbacku.
- **Změny**:
  - ✅ `post-preview.tsx`: `AnimatePresence mode="popLayout"` + `motion.div` (`key={effectivePlatform}`, `opacity 0→1` + `y: 8→0`, `0.35s`, ease `[0.32,0.72,0,1]`) kolem platform-switch – přepnutí tabu crossfaduje starý preview ven / nový dovnitř.
  - ✅ `posts/new/page.tsx`: TikTok privacy panel obalen v `AnimatePresence` (fade+slide při zobrazení/skrytí dle `hasTikTokIntent`); `active:scale-[0.98]` na 4 akční tlačítka (draft/queue/schedule/publish); account chip → `motion.button` s `layoutId` + `layout` spring animací ringu.
  - ✅ `edit-post-dialog.tsx`: account chip → `motion.button` s `layout` animací; `active:scale-[0.98]` na 5 akčních tlačítek (queue/schedule/publish + media/AI).
  - ✅ `ai-assistant-button.tsx`: `active:scale-[0.98]` na trigger (dropdown animuje skrz Radix `data-[state]` třídy).
  - ✅ Respektování `useReducedMotion()` na obou místech (`initial={reduce ? false : …}`, `exit={reduce ? undefined : …}`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem.

### 🎨 Prompt 067 – KROK 3: Quick slots pro výběr času (oprava overflow + chip state) ✅

- **Kontext**: Pod `DateTimePicker` uživatel neměl předvolby času; výběr vyžadoval otevření kalendáře, dropddowny karet navíc cliplovalo `overflow-hidden` z KROKU 2.
- **Změny**:
  - ✅ Nová komponenta `components/schedule-quick-slots.tsx` – 3 pill chipy pod pickerem: **Fronta (příští volný slot)** (fetch `getNextAvailableQueueSlot()`), **Dnes 18:00** (disable po 18:00), **Zítra 09:00**; klik předvyplní `scheduledAt` (ISO shodný s `normalizeScheduledAt`), picker zůstává plně editovatelný.
  - ✅ Aktivní chip: jasný indigo ring + glow (`border-indigo-500/70`, stín `0 0 14px rgba(99,102,241,0.35)`, dark `/90`/`/30`) + `aria-pressed`. `isActive` porovnává na úrovni minuty (odolné přepisu sekund/ms pickerem), předpočítané sloty nulované na ms.
  - ✅ i18n: `quickSlotQueue/quickSlotToday18/quickSlotTomorrow9/quickSlotQueueLoading` v cs/en/uk + oprava překlepu cs „veřní volný slot“→„příští volný slot“ (en/uk korektní).
  - 🐛 Fix overflow: odstraněn `overflow-hidden` ze 4 karet editoru (page.tsx) – dropdown „Interní štítky“ se nyní vykresluje nad okraji karet; ořez médií zůstává na media kontejneru (`overflow-hidden rounded-[20px]`).
  - 🐛 UX: `TagPicker` se po výběru štítku sám zavře (`setOpen(false)` v `toggle`) – nepřekrývá další sekce a uživatel nemusí klikat vedle.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (dropdown celý viditelný a po výběru se sám schová; chip má viditelný indigo glow).

### 🎨 Prompt 067 – KROK 2: Vizuální seskupení formuláře (3 glass karty + publish bar) ✅

- **Kontext**: Editor `/posts/new` měl jednu obří kartu se všemi 9 bloky pod sebou – neintuitivne, bez logické hierarchie.
- **Změny**:
  - ✅ Rozbito obří kartu na 3 Double-Bezel glass karty + samostatná „publish bar": **1. Obsah a média** (Content + Media), **2. Cílové účty** (výběr účtů + TikTok/X panely), **3. Metadata** (Lokace, Hashtagy, Interní štítky), **4. Čas a publikace** (Schedule + akční tlačítka). Double-Bezel: outer shell `rounded-[20px] ring-1 ring-white/10 p-1.5 overflow-hidden` + inner core `rounded-[14px] bg-card/40 shadow-[inset...] p-6`.
  - ✅ Konzistentní Shape Consistency: 20px karty / 14px vnitřné / pill tlačítka; hover ikony sekcí (FileText/Users/Tags/Calendar) s indigo glow.
  - ✅ Performance guardrail: odstrané `backdrop-blur` ze skrolujících prvkov (dropzone, media mřížka, TikTok panel) – glass efekt zůstal přes jemný tinted bg, bez GPU repaintů na mobilu.
  - ✅ i18n: nové klíče `sectionContent/sectionAccounts/sectionMeta/sectionSchedule` v cs/en/uk.
  - 🐛 Kosmetika po extra testu: inner padding `p-5`→`p-6` (obsah „levituje"), `overflow-hidden` na outer (nic nepřetéká přes rám), publish bar vzdušněji (`pt-3`, `gap-3`, `justify-end`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (karty vzdušné, nic nepřetéká, profesionální rozvržení).






