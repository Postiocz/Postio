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

function detectMediaType(mediaUrls: unknown): "text" | "photo" | "video" {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return "text";
  const first = mediaUrls[0];
  if (typeof first !== "string" || !first.trim()) return "text";
  const withoutHash = first.split("#")[0] ?? "";
  const withoutQuery = (withoutHash.split("?")[0] ?? "").toLowerCase();

  if (withoutQuery.endsWith(".mp4") || withoutQuery.endsWith(".mov")) return "video";
  if (
    withoutQuery.endsWith(".jpg") ||
    withoutQuery.endsWith(".png") ||
    withoutQuery.endsWith(".webp")
  ) {
    return "photo";
  }

  return "text";
}

async function publishToFacebook(
  accessToken: string,
  platformId: string,
  content: string,
  mediaType: "text" | "photo" | "video",
  mediaUrl: string | null
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(platformId)}`;

  const endpoint =
    mediaType === "video"
      ? `${base}/videos`
      : mediaType === "photo"
        ? `${base}/photos`
        : `${base}/feed`;

  const body = new URLSearchParams();

  if (mediaType === "video") {
    body.set("file_url", mediaUrl ?? "");
    body.set("description", content);
  } else if (mediaType === "photo") {
    body.set("url", mediaUrl ?? "");
    body.set("caption", content);
  } else {
    body.set("message", content);
  }

  body.set("access_token", accessToken);

  console.log(`>>> Publishing to Facebook [${mediaType}]`, {
    endpoint,
    platformId,
    hasMediaUrl: !!mediaUrl,
    contentLength: content.length,
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const payload = await res.json().catch(() => ({}));
    console.log(`>>> Facebook Graph API response [${mediaType}]`, {
      status: res.status,
      payload,
    });

    if (!res.ok) {
      const errorMessage =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : `Facebook API error (${res.status})`;
      return { success: false, error: errorMessage };
    }

    const externalId =
      typeof payload?.id === "string" ? payload.id : undefined;

    return { success: true, externalId };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "Unknown Facebook publish error";
    console.log(`>>> Facebook publish failed [${mediaType}]`, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
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

  console.log(">>> Checking for scheduled posts...");

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

  console.log(">>> Service Role Key initialized:", {
    hasKey: !!adminKey,
    keyPrefix: adminKey?.slice(0, 10) ?? "none",
    supabaseUrl,
  });

  const { data: allAccounts, error: allAccountsError } = await supabaseAdmin
    .from("social_accounts")
    .select("user_id, platform, is_active, platform_id");

  console.log("=== VŠECHNY ÚČTY V social_accounts ===", {
    error: allAccountsError,
    count: allAccounts?.length ?? 0,
    accounts: JSON.stringify(allAccounts),
  });

  const nowIso = new Date().toISOString();

  const { data: posts, error: postsError } = await supabaseAdmin
    .from("posts")
    .select("id, user_id, content, platforms, media_urls, status, scheduled_at")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (postsError) {
    console.log("process-scheduled-posts query error", { message: postsError.message });
    return Response.json({ error: postsError.message }, { status: 500 });
  }

  console.log(`>>> Found ${posts?.length ?? 0} scheduled post(s) to process`);

  if (!posts || posts.length === 0) {
    console.log(">>> No scheduled posts to process, exiting early");
    return Response.json(
      {
        ok: true,
        now: nowIso,
        totalFound: 0,
        published: 0,
        skipped: 0,
        failed: 0,
      },
      {
        status: 200,
        headers: { "access-control-allow-origin": "*" },
      }
    );
  }

  // Lock all selected posts immediately to prevent duplicate processing
  // If another instance of this function runs at the same time, it won't find these posts
  const postIds = posts.map((p) => p.id);
  console.log(`>>> Locking ${postIds.length} post(s): scheduled → publishing`, { postIds });

  const { error: lockError } = await supabaseAdmin
    .from("posts")
    .update({ status: "publishing" })
    .in("id", postIds)
    .eq("status", "scheduled");

  if (lockError) {
    console.log(">>> Failed to lock posts", { error: lockError.message });
    return Response.json(
      { error: "Failed to lock posts for processing", detail: lockError.message },
      { status: 500 }
    );
  }

  console.log(`>>> Posts locked successfully. Starting publish process...`);

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      console.log(`>>> Processing post: ${post.id}`, {
        platforms: post.platforms,
        hasMedia: Array.isArray(post.media_urls) && post.media_urls.length > 0,
        scheduledAt: post.scheduled_at,
      });

      const platforms = Array.isArray(post.platforms) ? post.platforms : [];
      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
      const content = String(post.content ?? "");

      let externalId: string | null = null;
      let publishError: string | null = null;

      const targetPlatform = Array.isArray(post.platforms) ? post.platforms[0] : 'facebook';

      if (platforms.includes("facebook")) {
        console.log(`Hledám účet pro user_id: ${post.user_id} (type: ${typeof post.user_id}) a platformu: facebook (target: ${targetPlatform})`);

        const { data: accounts, error: accountError } = await supabaseAdmin
          .from("social_accounts")
          .select("access_token, platform_id")
          .eq('user_id', post.user_id)
          .ilike('platform', 'facebook')
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log(`>>> Facebook account lookup result:`, {
          accountError,
          accountsFound: accounts?.length ?? 0,
          accounts,
        });

        if (accountError || !accounts?.[0]?.access_token || !accounts?.[0]?.platform_id) {
          if (!accounts || accounts.length === 0) {
            publishError = `CHYBA: Účet pro uživatele ${post.user_id} nebyl v social_accounts nalezen.`;
            console.log(`>>> ${publishError}`);
          } else {
            publishError = (accountError as { message?: string } | null)?.message ?? "Missing Facebook account (access_token/platform_id)";
            console.log(`>>> Facebook account error for post ${post.id}`, { error: publishError });
          }
        } else {
          const account = accounts[0];
          const mediaType = detectMediaType(mediaUrls);
          const mediaUrl = mediaType === "text" ? null : (mediaUrls[0] ?? null);

          const result = await publishToFacebook(
            account.access_token,
            account.platform_id,
            content,
            mediaType,
            mediaUrl
          );

          if (!result.success) {
            publishError = result.error ?? "Facebook publish failed";
            console.log(`>>> Facebook publish failed for post ${post.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> Facebook publish success for post ${post.id}`, { externalId });
          }
        }
      }

      const updateValues: Record<string, unknown> = {
        status: publishError ? "failed" : "published",
        published_at: publishError ? null : nowIso,
        external_id: externalId,
      };

      if (publishError) {
        updateValues.publish_error = publishError;
      } else {
        updateValues.scheduled_at = null;
        updateValues.publish_error = null;
      }

      const { error: updateError } = await supabaseAdmin
        .from("posts")
        .update(updateValues)
        .eq("id", post.id)
        .eq("status", "publishing");

      if (updateError) {
        failed += 1;
        console.log("process-scheduled-posts update failed", {
          postId: post.id,
          message: updateError.message,
        });
        continue;
      }

      if (!publishError) {
        const { error: analyticsError } = await supabaseAdmin
          .from("analytics")
          .insert({ post_id: post.id });

        if (analyticsError) {
          console.log("process-scheduled-posts analytics insert failed", {
            postId: post.id,
            message: analyticsError.message,
          });
        }
      }

      if (publishError) {
        failed += 1;
      } else {
        published += 1;
      }
    } catch (error) {
      failed += 1;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log("process-scheduled-posts unexpected error", {
        postId: post.id,
        message: errorMsg,
      });

      await supabaseAdmin
        .from("posts")
        .update({ status: "failed", publish_error: errorMsg })
        .eq("id", post.id)
        .eq("status", "publishing");
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
