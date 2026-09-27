// POSTIO – diagnostika Meta (Facebook / Instagram) engagement metrik
//
// Cíl: zjistit, KTERÝ endpoint reálně vrací lajky / komentáře / sdílení pro
// publikovaný FB Page post a co vrací IG media node. Defaultně nic nezapisuje do
// DB – jen čte tokeny z `social_accounts` a volá živé Graph API. Zápis provede
// pouze s příznakem `--write` a to výhradně do řádků cíleného postu.
//
// Důvod vzniku: FB insights vrací při chybějícím insight přístupu HTTP 200
// s prázdným `data: []` (viz dokumentace "An empty dataset is returned. You
// need the read_insights permission") → aplikace pak zapisovala tiché nuly.
// Lajky/komentáře navíc NEJSOU insights metriky, ale pole Post node:
//   ✅ `?fields=likes.summary(total_count).limit(0)`    → 200, total_count
//   ✅ `?fields=comments.summary(total_count).limit(0)` → 200, total_count
//   ❌ `reactions` / `shares` / `sharedposts`           → 400 #100 nonexisting field
//
// BEZPEČNOSTNÍ POZNÁMKA: volání označená níže jako „NEGATIVNÍ PROBE" záměrně
// zkouší neexistující pole, aby doložila chybu #100. NIKDY je nekopíruj do
// aplikačního kódu – jedno neplatné pole v `fields=` shodí CELÝ request (i
// platné lajky/komentáře v něm), což byl přesně bug, který tento skript odhalil.
//
// Skript neobsahuje žádné secrety – vše se čte z env / DB za běhu a access
// tokeny se v logu maskují (redact()).
//
// Spuštění (z kořene projektu):
//   node --env-file=.env.local scripts/diagnose-meta-engagement.mjs
//   node --env-file=.env.local scripts/diagnose-meta-engagement.mjs --content "Meta review demo"
//   node --env-file=.env.local scripts/diagnose-meta-engagement.mjs --post-id <uuid>
//   node --env-file=.env.local scripts/diagnose-meta-engagement.mjs --api v25.0

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[Diag] Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
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

const CONTENT_FILTER = argVal("--content") ?? "Meta review demo";
const POST_ID = argVal("--post-id");
const API_VERSION = argVal("--api") ?? "v26.0";
const WRITE = args.includes("--write");

/** Meta vrací v `paging` URL celý access_token – vždy ho maskuj. */
function redact(raw) {
  return String(raw).replace(/access_token=[^&\s"'\\]+/g, "access_token=***REDACTED***");
}

async function call(label, url) {
  console.log("");
  console.log(`--- ${label} ---`);
  console.log(`[Diag] GET ${redact(url)}`);
  let status = 0;
  let raw = "";
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    status = res.status;
    raw = await res.text();
  } catch (err) {
    console.log(`[Diag] fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, status, raw };
  }
  console.log(`[Diag] HTTP ${status}`);
  console.log(`[Diag] BODY ${redact(raw) || "(prazdne)"}`);
  return { ok: status >= 200 && status < 300, status, raw };
}

// ==== Reprodukce NOVÉ logiky fetchMetaInsights (fix 2026-09-27) ====
// FB: lajky/komentáře z post node fields (insights je nevrací), engagements =
// likes + comments + shares; IG: media-level insights jako dosud.
const NEW_FB_INSIGHT_METRICS = ["post_clicks", "post_total_media_view_unique", "post_media_view"];
const NEW_IG_INSIGHT_METRICS = ["reach", "likes", "comments", "shares", "saved", "total_interactions"];

async function insightsMap(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const raw = await res.text();
  const map = new Map();
  if (!res.ok) return { ok: false, status: res.status, map, empty: false };
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const values = body?.data ?? [];
  for (const item of values) {
    const v = item.values?.[0]?.value ?? 0;
    if (item.name) map.set(item.name, typeof v === "number" ? v : Number(v) || 0);
  }
  return { ok: true, status: res.status, map, empty: values.length === 0 };
}

async function mapNewLogic({ platform, token, nodeId }) {
  if (platform === "facebook") {
    const ins = await insightsMap(
      `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=${NEW_FB_INSIGHT_METRICS.join(",")}&period=lifetime&access_token=${token}`
    );

    const fieldsRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}?fields=id,likes.summary(total_count).limit(0),comments.summary(total_count).limit(0)&access_token=${token}`,
      { headers: { Accept: "application/json" } }
    );
    const fieldsRaw = await fieldsRes.text();
    let likes = 0;
    let comments = 0;
    const fieldsOk = fieldsRes.ok;
    if (fieldsOk) {
      try {
        const b = JSON.parse(fieldsRaw);
        likes = Number(b.likes?.summary?.total_count ?? 0);
        comments = Number(b.comments?.summary?.total_count ?? 0);
      } catch {
        /* zůstane 0 */
      }
    }
    const shares = 0;
    return {
      insightsStatus: ins.status,
      insightsEmpty: ins.empty,
      fieldsStatus: fieldsRes.status,
      metrics: {
        impressions: ins.map.get("post_total_media_view_unique") ?? 0,
        engagements: likes + comments + shares,
        likes,
        comments,
        shares,
        clicks: ins.map.get("post_clicks") ?? 0,
        saves: 0,
      },
    };
  }

  const ins = await insightsMap(
    `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=${NEW_IG_INSIGHT_METRICS.join(",")}&access_token=${token}`
  );
  if (!ins.ok) {
    return { insightsStatus: ins.status, insightsEmpty: ins.empty, fieldsStatus: null, metrics: null };
  }
  return {
    insightsStatus: ins.status,
    insightsEmpty: ins.empty,
    fieldsStatus: null,
    metrics: {
      impressions: ins.map.get("reach") ?? 0,
      engagements: ins.map.get("total_interactions") ?? 0,
      likes: ins.map.get("likes") ?? 0,
      comments: ins.map.get("comments") ?? 0,
      shares: ins.map.get("shares") ?? 0,
      clicks: 0,
      saves: ins.map.get("saved") ?? 0,
    },
  };
}

async function main() {
  console.log(`[Diag] Meta engagement diagnostika | API=${API_VERSION} | filtr="${CONTENT_FILTER}"`);

  let postQuery = supabase.from("posts").select("id, content, user_id, created_at");
  if (POST_ID) postQuery = postQuery.eq("id", POST_ID);
  else postQuery = postQuery.ilike("content", `%${CONTENT_FILTER}%`);

  const { data: posts, error: postErr } = await postQuery.limit(5);
  if (postErr || !posts?.length) {
    console.error("[Diag] Post nenalezen:", postErr ?? "(zadny zaznam)");
    process.exit(1);
  }

  for (const post of posts) {
    console.log("");
    console.log("====================================================");
    console.log(`[Diag] POST ${post.id} (${post.created_at})`);
    console.log(`[Diag] content: ${String(post.content).slice(0, 80)}`);

    const { data: ppRows, error: ppErr } = await supabase
      .from("post_platforms")
      .select("id, post_id, platform, status, account_id, external_id, last_sync_at, published_at")
      .eq("post_id", post.id);
    if (ppErr || !ppRows?.length) {
      console.log("[Diag] Zádné post_platforms:", ppErr ?? "(prazdne)");
      continue;
    }
    for (const pp of ppRows) {
      console.log(
        `[Diag]   target ${pp.platform} status=${pp.status} last_sync_at=${pp.last_sync_at} external_id=${pp.external_id}`
      );
    }

    const { data: analyticsRows } = await supabase
      .from("analytics")
      .select("post_platform_id, impressions, engagements, likes, comments, shares, clicks, saves, recorded_at")
      .in("post_platform_id", ppRows.map((r) => r.id));
    console.log(`[Diag] analytics radky: ${JSON.stringify(analyticsRows)}`);

    const accountIds = [...new Set(ppRows.map((r) => r.account_id).filter(Boolean))];
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("id, platform, account_name, platform_id, access_token, token_expires_at")
      .in("id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"]);
    for (const acc of accounts ?? []) {
      console.log(
        `[Diag]   ucet ${acc.platform} "${acc.account_name}" platform_id=${acc.platform_id} token=${acc.access_token ? `${acc.access_token.length} znaku` : "CHYBI"} expires=${acc.token_expires_at}`
      );
    }

    for (const pp of ppRows) {
      const account =
        accounts?.find((a) => a.id === pp.account_id) ??
        accounts?.find((a) => a.platform === pp.platform);
      if (!account?.access_token) {
        console.log(`[Diag] ${pp.platform}: preskoceno - chybi token uctu`);
        continue;
      }
      const token = account.access_token;

      let nodeId = pp.external_id ?? "";
      if (pp.platform === "instagram") {
        const pipe = nodeId.indexOf("|");
        if (pipe > 0) nodeId = nodeId.slice(pipe + 1).trim() || nodeId;
      }
      console.log(`[Diag] ${pp.platform}: nodeId=${nodeId}`);

      if (pp.platform === "facebook") {
        await call(
          "FB A) insights (aktualni kod aplikace)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=post_clicks,post_total_media_view_unique,post_media_view&period=lifetime&access_token=${token}`
        );
        await call(
          "FB B) insights bez period",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=post_clicks,post_total_media_view_unique,post_media_view&access_token=${token}`
        );
        await call(
          "FB C) insights post_reactions_by_type_total + post_activity_by_action_type",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=post_reactions_by_type_total,post_activity_by_action_type&period=lifetime&access_token=${token}`
        );
        await call(
          "FB D) reactions.summary(total_count).limit(0)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}?fields=id,reactions.summary(total_count).limit(0)&access_token=${token}`
        );
        await call(
          "FB E) comments.summary(total_count).limit(0)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}?fields=id,comments.summary(total_count).limit(0)&access_token=${token}`
        );
        await call(
          "FB F) reactions+comments summary spolecne",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}?fields=id,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&access_token=${token}`
        );
        await call(
          "FB G) sharedposts.summary(total_count).limit(0)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}?fields=id,sharedposts.summary(total_count).limit(0)&access_token=${token}`
        );
        await call(
          "FB H) insights post_media_view samostatne (lifetime)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=post_media_view&period=lifetime&access_token=${token}`
        );
      }

      if (pp.platform === "instagram") {
        await call(
          "IG A) insights (aktualni kod aplikace)",
          `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(nodeId)}/insights?metric=reach,likes,comments,shares,saved,total_interactions&access_token=${token}`
        );
      }

      // --write: reprodukce NOVÉHO syncAnalyticsInsights (fetch + upsert per target)
      if (WRITE) {
        console.log("");
        console.log(`[Diag] WRITE ${pp.platform} target=${pp.id}`);
        const mapped = await mapNewLogic({ platform: pp.platform, token, nodeId });
        console.log(
          `[Diag]   insights HTTP=${mapped.insightsStatus} empty=${mapped.insightsEmpty} fields HTTP=${mapped.fieldsStatus}`
        );
        if (!mapped.metrics) {
          console.log("[Diag]   zadne metriky -> zapis preskocen (stejne jako sync)");
        } else {
          console.log(`[Diag]   metrics=${JSON.stringify(mapped.metrics)}`);
          const now = new Date().toISOString();
          const { error: upErr } = await supabase
            .from("analytics")
            .upsert(
              { post_id: pp.post_id, post_platform_id: pp.id, ...mapped.metrics, recorded_at: now },
              { onConflict: "post_platform_id" }
            );
          console.log(upErr ? `[Diag]   upsert SELHAL: ${upErr.message}` : "[Diag]   upsert OK");
          // Uvolni 60min throttle, aby uživatelský klik na "Sync Analytics"
          // opravdu znovu fetchoval (E2E ověření v UI).
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() })
            .eq("id", pp.id);
        }
      }
    }
    if (WRITE) {
      const { data: finalRows } = await supabase
        .from("analytics")
        .select("post_platform_id, impressions, engagements, likes, comments, shares, clicks, saves")
        .in("post_platform_id", ppRows.map((r) => r.id));
      const sum = (key) => (finalRows ?? []).reduce((s, r) => s + (r[key] ?? 0), 0);
      console.log("");
      console.log("[Diag] === STAV PO ZAPISE (to, co uvidi Analytics stranka) ===");
      console.log(JSON.stringify(finalRows));
      console.log(
        `[Diag] Soucty: likes=${sum("likes")} comments=${sum("comments")} engagements=${sum("engagements")}`
      );
    }
  }
  console.log("");
  console.log(WRITE ? "[Diag] Hotovo (zapis proveden)." : "[Diag] Hotovo (dry-run, nic se nezapisovalo).");
}

main().catch((err) => {
  console.error("[Diag] Fatalni chyba:", err);
  process.exit(1);
});
