// POSTIO – ověřovací test parsování Meta Insights (fetchMetaInsights)
//
// Cíl: ověřit, že fix parsování `item.values?.[0]?.value ?? 0` v
// `src/app/[locale]/(dashboard)/analytics/actions.ts` (řádek ~491) funguje
// na reálných datech. Script najde STARŠÍ publishovaný FB/IG post
// (alespoň --days dní starý), pozove přesně ten samý Meta Insights endpoint
// jako aplikace, reprodukuje stejné mapování → metricMap a vypíše surovou
// odpověď + metricMap. S --write provede i upsert do `analytics` (stejně
// jako syncAnalyticsInsights) a vypíše řádek z DB.
//
// Spuštění (z kořene projektu):
//   node --env-file=.env.local scripts/verify-meta-insights.mjs --days 3 --limit 5 --write
//   node --env-file=.env.local scripts/verify-meta-insights.mjs --dry-run     # bez zápisu do DB
//
// POZNÁMKA: syncAnalyticsInsights je server action vyžadující přihlášenou
// session (cookies) – nelze ji spustit ze standalone scriptu. Proto tento
// script věrně reprodukuje krok za krokem to, co fetchMetaInsights +
// syncAnalyticsInsights dělají pro jeden post.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[Verify] Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const DAYS = Number(argVal("--days") ?? 3);
const LIMIT = Number(argVal("--limit") ?? 5);
const DRY_RUN = args.includes("--dry-run");
const DO_WRITE = args.includes("--write");
const TARGET_POST_ID = argVal("--post-id");
const ID_OVERRIDE = argVal("--id");      // manualne external_id pro Meta (např. čistý IG media_id)
const METRICS_OVERRIDE = argVal("--metrics"); // manualná zaplacená metrika jako comma-separated
const IG_MEDIA_ID = args.includes("--ig-media-id"); // IG: extrahuj media_id z "shortcode|media_id"
const PERIOD = argVal("--period");       // "lifetime"|"day"|"" – explicitní period param (FB potřebuje lifetime)
const API_VERSION = argVal("--api") ?? "v26.0";

// Přesně tyto metriky posílá aplikace (actions.ts řádek 466-474).
const METRICS = [
  "impressions",
  "engagement",
  "likes_count",
  "comments_count",
  "shares",
  "outbound_clicks",
  "saved_posts",
].join(",");

// Meta vracá v `insights` body URL `paging.previous/next` z celým
// access_token uvnitř. Zamaskuj je ve výstupu skriptu, aby se token
// nikdy nevypisoval v čitelné podobě. Regex pokrywa i percent-encoded
// token (do &.spaci, cudzysłowa, backslashe).
function redactAccessToken(raw) {
  return raw.replace(/access_token=[^&\s"'\\]+/g, "access_token=***REDACTED***");
}

// Reprodukce fetchMetaInsights z actions.ts (řádek 458-509).
async function fetchMetaInsights({ accessToken, externalId, metrics }) {
  const metricList = METRICS_OVERRIDE ?? METRICS;
  const periodParam = PERIOD ? `&period=${PERIOD}` : "";
  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(externalId)}/insights?metric=${metricList}${periodParam}&access_token=${accessToken}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return { response, url };
}

// Reprodukce mapování z actions.ts (řádek 489-494).
function buildMetricMap(values) {
  const metricMap = new Map();
  for (const item of values) {
    const val = item.values?.[0]?.value ?? 0;
    const name = item.name;
    if (name) metricMap.set(name, val);
  }
  return metricMap;
}

// Reprodukce return objektu z actions.ts (řádek 496-504).
function toMetrics(metricMap) {
  return {
    impressions: metricMap.get("impressions") ?? 0,
    engagements: metricMap.get("engagement") ?? 0,
    likes: metricMap.get("likes_count") ?? 0,
    comments: metricMap.get("comments_count") ?? 0,
    shares: metricMap.get("shares") ?? 0,
    clicks: metricMap.get("outbound_clicks") ?? 0,
    saves: metricMap.get("saved_posts") ?? 0,
  };
}

async function testCandidate(pp, post, account) {
  // Resolve ID pro Meta API: --id override, alebo pro IG z pipe → media_id
  let externalId = pp.external_id;
  if (ID_OVERRIDE) {
    externalId = ID_OVERRIDE;
  } else if (IG_MEDIA_ID && pp.platform === "instagram" && typeof externalId === "string" && externalId.includes("|")) {
    externalId = externalId.slice(externalId.indexOf("|") + 1);
  }

  const { response, url } = await fetchMetaInsights({
    accessToken: account.access_token,
    externalId,
  });

  const rawText = await response.text();
  console.log("");
  console.log("====================================================");
  console.log(`[Verify] Kandidát post_id=${pp.post_id}`);
  console.log(`[Verify]   platform=${pp.platform}`);
  console.log(`[Verify]   external_id (raw v DB)=${pp.external_id}`);
  console.log(`[Verify]   external_id (použitý pro Meta)={${externalId}}${ID_OVERRIDE ? " (override --id)" : IG_MEDIA_ID && pp.platform === "instagram" && pp.external_id.includes("|") ? " (IG media_id z pipe)" : ""}`);
  console.log(`[Verify]   created_at=${post?.created_at}  published_at=${pp.published_at}`);
  console.log(`[Verify]   account=${account.account_name}  id=${account.id}`);
  console.log(`[Verify]   account updated_at=${account.updated_at}  created_at=${account.created_at}`);
  const metaTok = account.metadata?.access_token;
  console.log(`[Verify]   token: sloupec vs metadata.access_token shoda=${account.access_token === metaTok}  (delka sloupce=${account.access_token?.length})`);
  console.log(`[Verify]   token_expires_at=${account.token_expires_at}`);
  console.log(`[Verify]   PERIOD=${PERIOD || "(žádný – default Meta)"}  API=${API_VERSION}`);
  console.log(`[Verify]   HTTP status=${response.status} ${response.statusText}`);
  console.log(`[Verify]   URL (token zamaskovan)=${redactAccessToken(url)}`);
  console.log("====================================================");

  let body;
  try {
    body = JSON.parse(rawText);
  } catch {
    body = null;
  }

  // ==== 1) Surová odpověď z Meta Graph API (body.data) ====
  console.log("");
  console.log("[Verify] === SUROVÁ ODPOVĚĎ (celý body, tokeny zamaskované) ===");
  console.log(redactAccessToken(rawText) || "(prázdná odpověď)");

  if (!response.ok) {
    console.log("[Verify] ❌ Meta API vrátila chybový status (viz body výše).");
    return { ok: false };
  }
  if (!body || !Array.isArray(body.data)) {
    console.log("[Verify] ❌ body.data není pole (prázdné/přihlášeno jinak).");
    return { ok: false };
  }

  // ==== 2) metricMap po mapování ====
  const metricMap = buildMetricMap(body.data);
  console.log("");
  console.log("[Verify] === metricMap po mapování (item.values?.[0]?.value ?? 0) ===");
  if (metricMap.size === 0) {
    console.log("(prázdné – žádný item.name se nenamapoval)");
  } else {
    for (const [k, v] of metricMap.entries()) {
      console.log(`  ${k} = ${v}`);
    }
  }

  const metrics = toMetrics(metricMap);
  console.log("");
  console.log("[Verify] === Výsledný objekt (return fetchMetaInsights) ===");
  console.log(JSON.stringify(metrics, null, 2));

  return { ok: true, metrics };
}

async function main() {
  console.log(`[Verify] Ověřovací test Meta Insights | days=${DAYS} limit=${LIMIT} dryRun=${DRY_RUN} write=${DO_WRITE}`);

  // 1) Starší publishované FB/IG posty s external_id (nejstarší napřed)
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from("post_platforms")
    .select("id, post_id, platform, status, external_id, last_sync_at, published_at")
    .in("platform", ["facebook", "instagram"])
    .eq("status", "published")
    .not("external_id", "is", null);

  if (TARGET_POST_ID) {
    q = q.eq("post_id", TARGET_POST_ID);
  } else {
    q = q.lt("published_at", cutoff);
  }
  const { data: ppRows, error: ppErr } = await q
    .order("published_at", { ascending: true }) // nejstarší napřed
    .limit(LIMIT);

  if (ppErr || !ppRows?.length) {
    console.error("[Verify] Chyba při hledání post_platforms (nebo žádné starší FB/IG posty):", ppErr);
    process.exit(1);
  }

  console.log(`[Verify] Nalezeno ${ppRows.length} starších publishovaných FB/IG postů:`);
  for (const pp of ppRows) {
    console.log(`  - ${pp.post_id}  ${pp.platform}  published_at=${pp.published_at}  external_id=${pp.external_id}`);
  }

  // 2) Načtu posts + účty
  const postIds = [...new Set(ppRows.map((r) => r.post_id))];
  const { data: posts, error: postErr } = await supabase
    .from("posts")
    .select("id, user_id, created_at")
    .in("id", postIds);
  if (postErr || !posts) {
    console.error("[Verify] Chyba při čtení posts:", postErr);
    process.exit(1);
  }
  const postsById = new Map(posts.map((p) => [p.id, p]));

  const userIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: accounts, error: accErr } = await supabase
    .from("social_accounts")
    .select("*")
    .in("user_id", userIds)
    .eq("is_active", true);
  if (accErr || !accounts) {
    console.error("[Verify] Chyba při čtení social_accounts:", accErr);
    process.exit(1);
  }

  // platform -> první aktivní účet
  const accountByPlatform = new Map();
  for (const acc of accounts) {
    if (!accountByPlatform.has(acc.platform)) accountByPlatform.set(acc.platform, acc);
  }
  console.log(`[Verify] Účty: ${accounts.map((a) => `${a.platform}:${a.account_name}`).join(", ")}`);

  // 3) Test každého kandidáta, dokud nenajdu post s nenulovými metrikami
  for (const pp of ppRows) {
    const post = postsById.get(pp.post_id);
    const account = accountByPlatform.get(pp.platform);
    if (!post || !account) {
      console.log(`[Verify] Skip post ${pp.post_id}: chybí post(${!!post})/account(${!!account})`);
      continue;
    }

    const result = await testCandidate(pp, post, account);
    if (!result.ok) {
      console.log("[Verify] → pokračuji na dalšího kandidáta.");
      continue;
    }

    if (DRY_RUN) {
      console.log("");
      console.log("[Verify] --dry-run: DB upsert přeskočen.");
      process.exit(0);
    }

    if (!Object.values(result.metrics).some((v) => v > 0)) {
      console.log("[Verify] → metriky samé nuly, pokračuji na dalšího kandidáta.");
      continue;
    }

    // 4) Upsert do analytics (reprodukce B9 z syncAnalyticsInsights)
    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase
      .from("analytics")
      .upsert(
        {
          post_id: pp.post_id,
          impressions: result.metrics.impressions,
          engagements: result.metrics.engagements,
          likes: result.metrics.likes,
          comments: result.metrics.comments,
          shares: result.metrics.shares,
          clicks: result.metrics.clicks,
          saves: result.metrics.saves,
          recorded_at: now,
        },
        { onConflict: "post_id" }
      );

    if (upsertErr) {
      console.error(`[Verify] Upsert selhal pro ${pp.post_id}:`, upsertErr);
      process.exit(1);
    }
    console.log(`[Verify] ✅ Upsert do analytics úspěšný (post ${pp.post_id}).`);

    // 5) Načtu řádek analytics z DB
    const { data: row } = await supabase
      .from("analytics")
      .select("*")
      .eq("post_id", pp.post_id)
      .maybeSingle();
    console.log("");
    console.log("[Verify] === Řádek `analytics` v DB (po upsert) ===");
    console.log(JSON.stringify(row, null, 2));

    // 6) Aktualizace last_sync_at (reprodukce B10)
    await supabase.from("post_platforms").update({ last_sync_at: now }).eq("id", pp.id);

    return; // stačí jeden úspěšný post
  }

  console.warn("");
  console.warn("[Verify] ⚠️ Žádný post nemá nenulové metriky (viz RAW odpovědi výše).");
}

main().catch((err) => {
  console.error("[Verify] Fatální chyba:", err);
  process.exit(1);
});