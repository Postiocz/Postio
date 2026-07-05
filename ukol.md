# Prompt 020 – Auto-Queue (Automatická fronta příspěvků)

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ:**
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceme začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování):**
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceme pokračovat. Nikdy nedělej více kroků najednou!

3. **ZÁKAZ GIT COMMITŮ:**
   NIKDY sám nespouštěj příkazy jako `git commit`, `git push`, `git add` ani se nepokoušej automaticky vytvářet verze kódu. Správu Gitu a commity provádím výhradně já sám manuálně ve svém terminálu.

4. **TESTOVÁNÍ PŘED ZÁPISEM:**
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ:**
   Pracujeme s lokálním modelem (Ornith) a máme tvrdý limit kontextového okna přesně **81 920 tokenů**. Pro ochranu před přehlcením paměti:
   - Buď ve svých odpovědích maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jen jednu funkci – používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutné.

6. **AUTOMATICKÉ POSOUVÁNÍ CHANGELOGU (Plovoucí okno):**
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 4) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, AUTOMATICKY vezmeš ten úplně nejstarší záznam ze dna `CHANGELOG.md` a přesuneš (připíšeš) ho na začátek souboru `CHANGELOG_ARCHIVE.md`. Hlavní changelog tak nikdy nepřekročí velikost 10 záznamů a nebude plýtvat kontextem.

---

## Kontext analýzy

### Aktuální stav
- **Tabulka `users`** už obsahuje preference: `timezone`, `time_format`, `start_of_week`, `default_posting_time` (migrace `006`).
- **Stránka `/settings/preferences`** načte data serverově a předá je do client komponenty `PreferencesForm`. Ukládání probíhá přes server action `updatePreferences` (FormData → `supabase.from("users").update(...)`).
- **Vytváření postů:** `createPostAction` (server action) vytvoří řádek v `posts` + duální zápis do `post_platforms`. Podporuje `status: "draft" | "scheduled" | "published"` a volitelné `scheduledAt`.
- **Editace postů:** `updatePost` (server action)允许 pouze `draft`/`scheduled` změny. Published/failed jsou chráněny publish flow.
- **EditPostDialog** má tři hlavní tlačítka: "Koncept" (`handleSubmit("draft")`), "Naplánovat" (`handleSubmit("scheduled")`) a "Publikovat" (`handlePublishNow`).
- **NewPostModal** (v kalendáři) má stejnou trojici tlačítek.

---

## Plán implementace – Checklist

### 1. Datová struktura pro rozvrh fronty

#### 1.1 Nový JSONB sloupec `posting_schedule` v tabulce `users`
- **Soubor:** `supabase/migrations/034_add_posting_schedule.sql`
- **Sloupec:** `posting_schedule JSONB DEFAULT NULL`
- **Struktura JSONB:**
  ```jsonc
  {
    "enabled": true,                       // globální spínač Auto-Queue
    "0": ["09:00", "14:00"],              // Sunday – pole časů (HH:MM)
    "1": ["10:30"],                        // Monday
    "2": ["09:00", "15:00"],              // Tuesday
    "3": [],                               // Wednesday – den vypnutý (prázdné pole)
    "4": ["11:00"],                        // Thursday
    "5": ["09:00", "17:00"],              // Friday
    "6": []                                // Saturday
  }
  ```
- **Proč JSONB v `users` a ne nová tabulka:** Rozvrh je úzkě svázán s uživatelskými preferencemi (timezone, default_posting_time). Jedna řádka na uživatele je jednodušší na čtení (žádný JOIN) a ideální pro JSONB. Pokud by šlo o týmové rozvrhy nebo sdílené šablony, dávalo by smysl samostatnou tabulku, ale pro current scope stačí sloupec.
- **Poznámka:** Dny jsou uloženy jako `0` (Sunday) – `6` (Saturday), což odpovídá JS `Date.getUTCDay()`.

---

### 2. Algoritmus – `getNextAvailableQueueSlot` (Server Action)

#### 2.1 Nový soubor: `src/lib/actions/queue.ts`
- **Funkce:** `export async function getNextAvailableQueueSlot(): Promise<{ success: boolean; scheduledAt?: string; error?: string }>`

**Algoritmus:**
```
1. Načti aktuálního uživatele (supabase.auth.getUser)
2. Načti users řádek: timezone, posting_schedule, default_posting_time
3. Pokud posting_schedule je NULL nebo enabled === false:
   → Fallback: zítra v default_posting_time (respektuj user timezone)
   → Return ISO string
4. Načti všechny scheduled posts uživatele:
   supabase.from("posts").select("id").eq("user_id", userId).eq("status", "scheduled")
   + JOIN na post_platforms pro přesná scheduled_at
5. Pro každý den v budoucnosti (max 30 dní dopředu):
   a. Zjisti den v týdnu (0-6)
   b. Najdi časové sloty z rozvrhu pro tento den
   c. Pro každý slot:
      - Vypočítej plné datetime v timezone uživatele
      - Zkontroluj, zda tento čas NENÍ již obsazen jiným scheduled postem (tolerance ±15 minut)
      - Pokud je volný → return ISO string
6. Pokud se nedaří najít slot do 30 dní → fallback na default_posting_time za 31 dní
```

**Klíčové detaily:**
- Timezone handling: Použij `Intl.DateTimeFormat` a ruční výpočet offsetu, protože v server actions nemáme přístup k `luxon` nebo `date-fns` bez instalace. Nebo použij jednoduchý přístup – pracuj s UTC a přepočítej pomocí timezone offsetu z `new Date().toLocaleString("en-US", { timeZone })`.
- Tolerance ±15 minut mezi příspěvky: Zabrání kolizi, kdy by dva příspěvky šly téměř ve stejnou dobu.

---

### 3. UI – Nastavení rozvrhu (Settings → Předvolby)

#### 3.1 Rozšíření `preferences-form.tsx`
- Nová sekce **"Rozvrh fronty"** pod stávající sekcemi (Timezone, Time Format, Start of Week, Default Posting Action).
- **Design:** Stejný card styl (`rounded-[20px]`, glassmorphism, ikonová barva = cyan/teal).
- **Komponenta:** `QueueScheduleSection` – vnitřní komponenta nebo samostatný soubor.

**UI prvek obsahuje:**
- Toggle spínač "Automatická fronta" (enabled/disabled)
- 7 řádků pro dny v týdnu:
  - Každý řádek: název dne + mini toggle (zapnuto/vypnuto den) + seznam časových slotů
  - Tlačítko "+ Přidat čas" pro každý zapnutý den
  - Každý časový slot: `<input type="time">` + tlačítko smazání (X)
- Vzor inspirovaný Buffer-styleUI

#### 3.2 Rozšíření `actions.ts` (updatePreferences)
- Přidat do FormData zpracování: `posting_schedule` (JSON string → parse → JSONB update).
- Server action `updatePreferences` rozšířit o nový parametr.

#### 3.3 Rozšíření `page.tsx` (preferences page)
- Při načítání uživatelských dat přidat `posting_schedule` do SELECT query.
- Předat jako prop do `PreferencesForm`.

---

### 4. UI – Tlačítko "Přidat do fronty" v editorech

#### 4.1 EditPostDialog (`src/components/edit-post-dialog.tsx`)
- **Nový handler:** `handleQueueToSchedule` – zavolá server action `getNextAvailableQueueSlot()`, dostane `scheduledAt` a pak zavolá `handleSubmit("scheduled")` s vypočteným časem.
- **Nové tlačítko:** Mezi "Koncept" a "Naplánovat" (nebo jako sekundární akce vedle "Naplánovat").
  - Ikona: `ListOrdered` nebo `Clock` z lucide-react
  - Label: "Přidat do fronty"
  - Variant: outline s jemným gradientem (odlišné od "Naplánovat")
- **Toast notifikace:** "Příspěvek byl zařazen do fronty na [vypočítané datum a čas]" – formátované podle user timezone a time_format preference.

#### 4.2 NewPostModal (`src/components/calendar/new-post-modal.tsx`)
- Stejné tlačítko "Přidat do fronty" přidat mezi stávající tři akční tlačítka.
- Stejný handler pattern.

---

### 5. Lokalizace

#### 5.1 Nové klíče pro `cs.json` (posts namespace):
```json
"addToQueue": "Přidat do fronty",
"queuedSuccess": "Příspěvek byl zařazen do fronty na {date}",
"queueLoading": "Výpočet času..."
```

#### 5.2 Nové klíče pro `cs.json` (settings namespace):
```json
"queueSchedule": "Rozvrh fronty",
"queueScheduleDescription": "Nastavte dny a časy, kdy se příspěvky automaticky zařazují do fronty publikování.",
"autoQueueEnabled": "Automatická fronta",
"addTime": "Přidat čas",
"monday": "Pondělí",
"tuesday": "Úterý",
"wednesday": "Středa",
"thursday": "Čtvrtek",
"friday": "Pátek",
"saturday": "Sobota",
"sunday": "Neděle"  // už existí
```

#### 5.3 Stejné klíče pro `en.json` a `uk.json`

---

## Pořadí implementace (krok za krokem)

| Krok | Soubory | Popis |
|------|---------|-------|
| ✅ **Krok 1** | `supabase/migrations/034_add_posting_schedule.sql` | DB migrace – nový sloupec `posting_schedule JSONB` |
| ✅ **Krok 2** | `src/lib/supabase/types.ts` | Aktualizace TypeScript typů pro `users` tabulku |
| ✅ **Krok 3** | `src/lib/actions/queue.ts` (nový) | Server action `getNextAvailableQueueSlot()` – algoritmus fronty |
| ✅ **Krok 4** | `src/messages/cs.json`, `en.json`, `uk.json` | Přidat všechny nové i18n klíče |
| ✅ **Krok 5** | `src/app/[locale]/(dashboard)/settings/preferences/actions.ts` | Rozšířit `updatePreferences` o `posting_schedule` |
| ✅ **Krok 6** | `src/app/[locale]/(dashboard)/settings/preferences/page.tsx` | Načíst `posting_schedule` z DB a předat do formu |
| ✅ **Krok 7** | `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx` | Přidat sekci "Rozvrh fronty" s UI pro editaci rozvrhu |
| ✅ **Krok 8** | `src/components/edit-post-dialog.tsx` | Přidat tlačítko "Přidat do fronty" + handler `handleQueueToSchedule` |
| ✅ **Krok 9** | `src/components/calendar/new-post-modal.tsx` | Přidat tlačítko "Přidat do fronty" do modálu nového postu |

---

## Rizika a poznámky

- **Timezone handling v JS:** Server actions běží na serveru, kde je systémový čas obvykle UTC. Musíme explicitně pracovat s uživatelskou timezone (`users.timezone`). Použijeme `Intl` API nebo ruční offset výpočet.
- **Kolize slotů:** Tolerance ±15 minut mezi příspěvky zabraňuje přetížení jednoho časového okna.
- **Backward compatibility:** `posting_schedule` je NULL po defaultu – uživatelé bez nastaveného rozvrhu dostanou fallback na `default_posting_time` + zítra. Žádný breaking change.
- **NEZMĚNÍME:** Okamžité publikování, manuální plánování, náhledy, analytiky, publish flow, post_platforms logiku.
