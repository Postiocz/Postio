/**
 * Dashboard statistics – pure utility functions for aggregating data
 * on the Postio Dashboard page.
 *
 * Funkce zde jsou čisté (pure) – nemají žádné vedlejší efekty ani závislosti
 * na React/Next/Supabase. Snadno se testují a znovu používají.
 *
 * Poznámka k datovému modelu:
 * - Štítky NEJSOU uloženy v `posts.labels` (takový sloupec neexistuje).
 *   Místo toho používáme normalizovaný model `tags` + `post_tags` (viz migrace
 *   007_create_tags_table.sql a 028_create_post_tags.sql).
 * - Publikace jsou v `post_platforms` (status='published', published_at).
 *   Tato data jsou single source of truth pro všechny publikace – totéž
 *   používá i Analytics page.
 */

/**
 * TopLabelsChart vstup – již agregované položky.
 */
export type TopLabelItem = {
  id: string;
  name: string;
  color: string;
  count: number;
};

/**
 * PlatformDonutChart vstup.
 */
export type PlatformDatum = {
  name: string;
  value: number;
  color: string;
};

/**
 * Vypočítá denní sérii (streak) – počet po sobě jdoucích dní, kdy uživatel
 * publikoval alespoň jeden příspěvek. Série končí DNEM NEBO VČEREJŠKEM –
 * pokud uživatel dnes ještě nepublikoval, ale včera ano, série stále platí
 * (jinak by se vždy ráno vynulovala, což je demotivující).
 *
 * Algoritmus:
 *   1. Z `publishedAtDates` (pole ISO datumů) extrahujeme unikátní dny (UTC).
 *   2. Seřadíme sestupně.
 *   3. Pokud nejnovější den není DNES ani VČERA, streak = 0
 *      (uživatel ztratil sérii).
 *   4. Jinak počítáme po sobě jdoucí dny od nejnovějšího směrem do minulosti.
 *
 * @param publishedAtDates - ISO datumy publikací (libovolné pořadí, duplicity OK).
 * @param now - referenční čas (default = Date.now()), pro testovatelnost.
 * @returns Počet dní v řadě.
 */
export function calculateStreak(
  publishedAtDates: (string | Date | null | undefined)[],
  now: Date = new Date()
): number {
  // 1. Převedeme na Set<string> unikátních dnů ve formátu YYYY-MM-DD (UTC).
  const days = new Set<string>();
  for (const d of publishedAtDates) {
    if (!d) continue;
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) continue;
    days.add(date.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;

  // 2. Nejnovější publikovaný den.
  const sortedDesc = Array.from(days).sort().reverse();
  const latestDay = sortedDesc[0];

  // 3. Referenční den: dnes nebo včera (UTC).
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (latestDay !== today && latestDay !== yesterday) {
    return 0;
  }

  // 4. Počítáme po sobě jdoucí dny od latestDay směrem zpět.
  let streak = 0;
  const cursor = new Date(latestDay + "T00:00:00Z");
  for (;;) {
    const dayStr = cursor.toISOString().slice(0, 10);
    if (days.has(dayStr)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Spočítá, kolik příspěvků bylo vytvořeno v posledních `days` dnech
 * (včetně dneška). Slouží jako trend indikátor.
 *
 * @param createdAtDates - ISO datumy vytvoření.
 * @param days - šířka okna v dnech (default 7 = "tento týden").
 * @param now - referenční čas, pro testovatelnost.
 */
export function calculateTrend(
  createdAtDates: (string | Date | null | undefined)[],
  days: number = 7,
  now: Date = new Date()
): number {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  let count = 0;
  for (const d of createdAtDates) {
    if (!d) continue;
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) continue;
    if (date >= cutoff) count += 1;
  }
  return count;
}

/**
 * Agreguje top N štítků z `post_tags` (vazební tabulka) + `tags`.
 *
 * Vstup je RAW: `post_tags` se přes JOIN připojí k `tags`.
 * Pokud nechceme JOIN na straně serveru, můžeme předat dvě pole
 * (postTags a tags) – ale protože Supabase umí JOIN, doporučujeme
 * předat výsledek jednoho dotazu.
 *
 * Vrací setříděné (sestupně dle count) a oříznuté na `limit` položek.
 */
export function aggregateTopLabels(
  rows: Array<{
    tag_id: string;
    tags: { id: string; name: string; color: string } | null;
  }>,
  limit: number = 5
): TopLabelItem[] {
  const counts = new Map<string, TopLabelItem>();
  for (const row of rows) {
    if (!row.tags) continue;
    const existing = counts.get(row.tag_id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.tag_id, {
        id: row.tags.id,
        name: row.tags.name,
        color: row.tags.color,
        count: 1,
      });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Agreguje publikované příspěvky podle platformy.
 *
 * Vstup: `post_platforms` řádky se status='published'. groupovat se
 * bude podle `platform` (instagram, facebook, twitter, linkedin, ...).
 *
 * Výstup: setříděné (sestupně dle value) pole + přiřazené barvy.
 * Facebook a Instagram mají brand colors, ostatní dostanou neutrální
 * purple z palety Postio.
 */
export function aggregatePlatforms(
  rows: Array<{ platform: string }>
): PlatformDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.platform, (counts.get(row.platform) ?? 0) + 1);
  }

  // Paleta – držíme konzistenci s Postio designem (indigo/purple akcent).
  // Facebook a Instagram mají své brand barvy.
  const palette: Record<string, string> = {
    facebook: "#1877F2",
    instagram: "#E1306C",
    twitter: "#1d9bf0",
    linkedin: "#0a66c2",
    tiktok: "#ff0050",
    youtube: "#ff0000",
  };
  const fallback = "#a855f7"; // purple-500 (Postio akcent)

  const data: PlatformDatum[] = [];
  for (const [platform, value] of counts.entries()) {
    // Kanonizujeme jméno pro čitelnost v UI.
    const name =
      platform === "twitter"
        ? "X (Twitter)"
        : platform.charAt(0).toUpperCase() + platform.slice(1);
    data.push({
      name,
      value,
      color: palette[platform] ?? fallback,
    });
  }
  return data.sort((a, b) => b.value - a.value);
}

/**
 * Připraví data pro donut chart podle pravidla "FB vs IG vs ostatní":
 *   - Pokud existují 2+ platformy, ale víc než 2 mají data, zachováme je všechny.
 *   - Pokud je jen 1 platforma, vrátíme ji tak jak je.
 *   - Pokud žádná, vrátíme prázdné pole.
 *
 * Funkce zatím jen normalizuje pořadí: Facebook a Instagram mají přednost
 * v legendě (větší relevance pro Postio). Ostatní platformy se seřadí
 * sestupně dle value.
 */
export function prioritizeForDonut(data: PlatformDatum[]): PlatformDatum[] {
  if (data.length <= 2) return data;

  // Vytáhneme FB a IG (pokud existují) dopředu, zbytek seřadíme sestupně.
  const fb = data.find((d) => d.name.toLowerCase().includes("facebook"));
  const ig = data.find((d) => d.name.toLowerCase().includes("instagram"));
  const rest = data
    .filter((d) => d !== fb && d !== ig)
    .sort((a, b) => b.value - a.value);

  return [fb, ig, ...rest].filter(Boolean) as PlatformDatum[];
}
