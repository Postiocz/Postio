// POSTIO – diagnostický test LinkedIn UGC Posts API DELETE
//
// Tento script obchází UI dialog (který aktuálně blokuje smazání s
// odůvodněním "LinkedIn neumožňuje smazání přes API" – což je
// technicky špatně, viz https://learn.microsoft.com/linkedin/) a
// zavolá LinkedIn API DELETE přímo. Cílem je ověřit, že:
//
//   1. access_token v DB je platný,
//   2. token má scope `w_member_social` (nebo `w_organization_social`),
//   3. LinkedIn skutečně vrátí 204 No Content pro existující post
//      (nebo 404, pokud už mezitím zmizel).
//
// Spuštění (v PowerShellu z kořene projektu):
//
//   node --env-file=.env.local scripts/test-linkedin-delete.mjs urn:li:share:7474313283974488064
//
// Po úspěšném testu můžeš:
//   - smazat tento soubor (test script), NEBO
//   - ho nechat jako diagnostický nástroj pro support.

import { createClient } from "@supabase/supabase-js";

const externalId = process.argv[2];
if (!externalId) {
  console.error(
    "[Test] Chybí externalId. Použití:\n" +
      "  node --env-file=.env.local scripts/test-linkedin-delete.mjs <urn:li:share:...>",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[Test] Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
  console.error("[Test] Chybí LINKEDIN_CLIENT_ID nebo LINKEDIN_CLIENT_SECRET.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function refreshLinkedInToken(refreshToken) {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  });
  return res.json();
}

async function main() {
  console.log("=================================================");
  console.log(`[Test] LinkedIn DELETE ${externalId}`);
  console.log("=================================================");

  // 1) Najdi aktivní LinkedIn účet
  const { data: accounts, error: accErr } = await supabase
    .from("social_accounts")
    .select("*")
    .ilike("platform", "linkedin")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (accErr || !accounts?.length) {
    console.error("[Test] Žádný aktivní LinkedIn účet v DB:", accErr);
    process.exit(1);
  }

  const account = accounts[0];
  console.log(`[Test] Account ID:        ${account.id}`);
  console.log(`[Test] User ID:           ${account.user_id}`);
  console.log(`[Test] platform_id (sub): ${account.platform_id}`);
  console.log(`[Test] token_expires_at:  ${account.token_expires_at}`);
  console.log(`[Test] LinkedIn URL:      https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}`);

  // 2) Refresh tokenu pokud se blíží expirace (< 24 h)
  let accessToken = account.access_token;
  const expiresAtMs = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;
  const refreshThresholdMs = expiresAtMs - 24 * 60 * 60 * 1000;

  if (Date.now() >= refreshThresholdMs) {
    console.log("[Test] Token se blíží expiraci – refreshuji…");
    const refreshTokenValue = account.metadata?.refresh_token;
    if (!refreshTokenValue) {
      console.error(
        "[Test] V metadata chybí refresh_token. Je potřeba znovu projít OAuth.",
      );
      process.exit(1);
    }
    const refreshed = await refreshLinkedInToken(refreshTokenValue);
    if (!refreshed.access_token) {
      console.error("[Test] Refresh selhal:", refreshed);
      process.exit(1);
    }
    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000,
    ).toISOString();
    await supabase
      .from("social_accounts")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: newExpiresAt,
        metadata: {
          ...(account.metadata ?? {}),
          refresh_token: refreshed.refresh_token,
        },
      })
      .eq("id", account.id);
    console.log(`[Test] Token refreshnutý. Nové expires_at: ${newExpiresAt}`);
  } else {
    console.log("[Test] Token ještě platný, používám jak je.");
  }

  // 3) Ověření přes /v2/userinfo (stejná diagnostika jako v publish.ts)
  try {
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const userInfoBody = await userInfoRes.text();
    const subMatch = userInfoBody.includes(`"sub":"${account.platform_id}"`);
    console.log(`[Test] /v2/userinfo: status=${userInfoRes.status}, subMatches=${subMatch}`);
  } catch (e) {
    console.warn("[Test] /v2/userinfo selhal:", e.message);
  }

  const dryRun = process.argv.includes("--dry-run");

  // 4) Skutečný DELETE (přeskočen v --dry-run)
  const url = `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(externalId)}`;
  console.log("---");
  if (dryRun) {
    console.log(`[Test] DRY-RUN: DELETE by se provedl na: ${url}`);
    console.log(`[Test] Token (last 10): …${accessToken.slice(-10)}`);
    console.log("[Test] Žádná data nebyla poslána na LinkedIn. Příspěvek zůstává nedotčený.");
    console.log("[Test] Pro skutečné smazání spusť příkaz bez --dry-run.");
    return;
  }
  console.log(`[Test] DELETE ${url}`);
  console.log(`[Test] Token (last 10): …${accessToken.slice(-10)}`);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": process.env.LINKEDIN_VERSION || "202510",
    },
  });

  console.log("---");
  console.log(`[Test] Status: ${res.status} ${res.statusText}`);
  console.log("[Test] Response headers:");
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const body = await res.text();
  console.log(`[Test] Body: ${body || "(prázdné)"}`);
  console.log("---");

  if (res.status === 204) {
    console.log("[Test] ✅ DELETE úspěšný (204 No Content) – příspěvek smazán z LinkedInu.");
  } else if (res.status === 404) {
    console.log(
      "[Test] ⚠️  404 Not Found – příspěvek na LinkedInu už neexistuje (možná byl smazán dříve).",
    );
  } else if (res.status === 401) {
    console.log(
      "[Test] ❌ 401 Unauthorized – token neplatný. Je potřeba znovu projít OAuth v Postiu.",
    );
  } else if (res.status === 403) {
    console.log(
      "[Test] ❌ 403 Forbidden – token nemá scope `w_member_social`. Zkontroluj OAuth scopes.",
    );
  } else {
    console.log(`[Test] ❓ Neočekávaný status ${res.status}. Viz body výše.`);
  }
}

main().catch((err) => {
  console.error("[Test] Fatální chyba:", err);
  process.exit(1);
});