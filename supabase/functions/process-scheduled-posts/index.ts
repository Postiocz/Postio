import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.6.3";

function getApiKey(request: Request): string | null {
  const apiKey = request.headers.get("apikey") ?? request.headers.get("Apikey");
  return apiKey?.trim() || null;
}

function getBearerToken(request: Request): string | null {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

async function verifyServiceRoleJwt(params: { token: string; supabaseUrl: string }) {
  const jwks = createRemoteJWKSet(
    new URL(`${params.supabaseUrl}/auth/v1/.well-known/jwks.json`)
  );

  const verified = await jwtVerify(params.token, jwks);
  const role = (verified.payload as Record<string, unknown>).role;

  if (role !== "service_role") {
    throw new Error("JWT does not have service_role");
  }

  return verified;
}

function isLikelyJwt(token: string) {
  return token.split(".").length === 3;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getSupabaseSecretKeys(): Record<string, string> | null {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const record: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") record[k] = v;
    }
    return Object.keys(record).length > 0 ? record : null;
  } catch {
    return null;
  }
}

function keyMatchesAny(params: { provided: string; expected: string[] }) {
  for (const key of params.expected) {
    if (timingSafeEqual(params.provided, key)) return true;
  }
  return false;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "authorization,apikey,content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const explicitAdminKey =
    Deno.env.get("POSTIO_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeys = getSupabaseSecretKeys();
  const defaultSecretKey = secretKeys?.default ?? null;

  const adminKey = explicitAdminKey ?? defaultSecretKey;

  if (!supabaseUrl || !adminKey) {
    return Response.json(
      { error: "Missing SUPABASE_URL or an admin API key" },
      { status: 500 }
    );
  }

  const expectedKeys = [
    ...(explicitAdminKey ? [explicitAdminKey] : []),
    ...(secretKeys ? Object.values(secretKeys) : []),
  ];

  const apiKey = getApiKey(request);
  const token = getBearerToken(request);

  try {
    if (apiKey) {
      if (!keyMatchesAny({ provided: apiKey, expected: expectedKeys })) {
        throw new Error("API key mismatch");
      }
      console.log("process-scheduled-posts auth ok (apikey)");
    } else if (token) {
      if (isLikelyJwt(token)) {
        const verified = await verifyServiceRoleJwt({ token, supabaseUrl });
        console.log("process-scheduled-posts auth ok (jwt)", {
          alg: verified.protectedHeader.alg,
          kid: verified.protectedHeader.kid,
          role: (verified.payload as Record<string, unknown>).role,
        });
      } else {
        if (!keyMatchesAny({ provided: token, expected: expectedKeys })) {
          throw new Error("Secret key mismatch");
        }
        console.log("process-scheduled-posts auth ok (secret key)");
      }
    } else {
      return Response.json({ error: "Missing apikey header" }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const nowIso = new Date().toISOString();

  const { data: posts, error: postsError } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (postsError) {
    console.log("process-scheduled-posts query error", { message: postsError.message });
    return Response.json({ error: postsError.message }, { status: 500 });
  }

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts ?? []) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from("posts")
        .update({ status: "published", published_at: nowIso })
        .eq("id", post.id)
        .eq("status", "scheduled")
        .select("id");

      if (updateError) {
        failed += 1;
        console.log("process-scheduled-posts update failed", {
          postId: post.id,
          message: updateError.message,
        });
        continue;
      }

      if (!updatedRows || updatedRows.length === 0) {
        skipped += 1;
        continue;
      }

      const { error: analyticsError } = await supabaseAdmin
        .from("analytics")
        .insert({ post_id: post.id });

      if (analyticsError) {
        failed += 1;
        console.log("process-scheduled-posts analytics insert failed", {
          postId: post.id,
          message: analyticsError.message,
        });
        continue;
      }

      published += 1;
    } catch (error) {
      failed += 1;
      console.log("process-scheduled-posts unexpected error", {
        postId: post.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("process-scheduled-posts done", {
    totalFound: posts?.length ?? 0,
    published,
    skipped,
    failed,
  });

  return Response.json(
    {
      ok: true,
      now: nowIso,
      totalFound: posts?.length ?? 0,
      published,
      skipped,
      failed,
    },
    {
      status: 200,
      headers: { "access-control-allow-origin": "*" },
    }
  );
});
