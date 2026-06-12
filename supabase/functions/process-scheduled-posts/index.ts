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

/**
 * Build the final caption: content + location + hashtags
 */
function buildFinalCaption(params: {
  content: string;
  location?: string | null;
  tags?: string[];
}): string {
  const parts: string[] = [params.content.trim()];

  if (params.location?.trim()) {
    parts.push(`📍 ${params.location.trim()}`);
  }

  const normalizedTags = Array.isArray(params.tags)
    ? params.tags.filter((t) => typeof t === "string" && t.trim())
    : [];

  if (normalizedTags.length > 0) {
    const hashtagLine = normalizedTags
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    parts.push(hashtagLine);
  }

  return parts.join("\n");
}

async function publishToFacebook(
  accessToken: string,
  platformId: string,
  content: string,
  mediaType: "text" | "photo" | "video",
  mediaUrls: string[]
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(platformId)}`;

  try {
    if (mediaType === "video") {
      // Single video publish
      const mediaUrl = mediaUrls[0] ?? "";
      const body = new URLSearchParams();
      body.set("file_url", mediaUrl);
      body.set("description", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [video]`, { platformId, mediaUrl });
      const res = await fetch(`${base}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [video]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };

    } else if (mediaType === "photo" && mediaUrls.length > 1) {
      // Multi-photo gallery: upload each as unpublished, then publish via /feed with attached_media
      console.log(">>> Nahrávám galerii s počtem fotek:", mediaUrls.length);

      const mediaIds: string[] = [];
      for (let i = 0; i < mediaUrls.length; i++) {
        const uploadBody = new URLSearchParams();
        uploadBody.set("url", mediaUrls[i]);
        uploadBody.set("published", "false");
        uploadBody.set("access_token", accessToken);

        const uploadRes = await fetch(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: uploadBody,
        });
        const uploadPayload = await uploadRes.json().catch(() => ({}));
        console.log(`>>> Upload photo ${i + 1}:`, { status: uploadRes.status, payload: uploadPayload });

        if (!uploadRes.ok) {
          const uploadErr = typeof uploadPayload?.error?.message === "string" ? uploadPayload.error.message : `Upload failed (${uploadRes.status})`;
          return { success: false, error: `Upload photo ${i + 1} failed: ${uploadErr}` };
        }

        const photoId = typeof uploadPayload?.id === "string" ? uploadPayload.id : undefined;
        if (!photoId) return { success: false, error: `Upload photo ${i + 1} returned no ID.` };
        mediaIds.push(photoId);
      }

      // Publish feed with attached_media
      const feedBody = new URLSearchParams();
      feedBody.set("message", content);
      feedBody.set("attached_media", JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))));
      feedBody.set("access_token", accessToken);

      console.log(">>> PUBLIKUJI GALERII...", { mediaIds });
      const feedRes = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: feedBody,
      });
      const feedPayload = await feedRes.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [gallery]`, { status: feedRes.status, payload: feedPayload });

      if (!feedRes.ok) {
        const feedErr = typeof feedPayload?.error?.message === "string" ? feedPayload.error.message : `Feed publish failed (${feedRes.status})`;
        return { success: false, error: feedErr };
      }
      const externalId = typeof feedPayload?.id === "string" ? feedPayload.id : undefined;
      return { success: true, externalId };

    } else if (mediaType === "photo" && mediaUrls.length === 1) {
      // Single photo (fast path)
      const body = new URLSearchParams();
      body.set("url", mediaUrls[0]);
      body.set("caption", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [photo]`, { platformId, mediaUrl: mediaUrls[0] });
      const res = await fetch(`${base}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [photo]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };

    } else {
      // Text-only publish
      const body = new URLSearchParams();
      body.set("message", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [text]`, { platformId, contentLength: content.length });
      const res = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [text]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown Facebook publish error";
    console.log(`>>> Facebook publish failed [${mediaType}]`, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Publish a post to Instagram via the two-phase IG Container process.
 * Phase 1: Create container (/{ig_user_id}/media)
 * Phase 2: Publish container (/{ig_user_id}/media_publish)
 */
async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  content: string,
  mediaUrls: string[]
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  // Instagram requires at least one image or video
  if (mediaUrls.length === 0) {
    return { success: false, error: "Instagram vyžaduje alespoň jeden obrázek nebo video." };
  }

  const mediaType = detectMediaType(mediaUrls);
  const baseUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}`;

  // --- Phase 1: Create Media Container ---
  console.log(">>> Vytvářím IG kontejner...", { igUserId, mediaType, mediaUrls });

  const containerBody = new URLSearchParams();
  containerBody.set("access_token", accessToken);
  containerBody.set("caption", content);

  const mediaUrl = mediaUrls[0];

  if (mediaType === "video") {
    containerBody.set("video_url", mediaUrl);
    containerBody.set("media_type", "REELS");
  } else {
    containerBody.set("image_url", mediaUrl);
    containerBody.set("media_type", "IMAGE");
  }

  const containerRes = await fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerBody,
  });

  const containerPayload = await containerRes.json().catch(() => ({}));
  console.log(">>> META RESPONSE (IG container):", { status: containerRes.status, payload: containerPayload });

  if (!containerRes.ok) {
    const containerErr = typeof containerPayload?.error?.message === "string" ? containerPayload.error.message : `IG container creation failed (${containerRes.status})`;
    return { success: false, error: containerErr };
  }

  const creationId = typeof containerPayload?.id === "string" ? containerPayload.id : undefined;
  if (!creationId) {
    return { success: false, error: "IG container creation returned no ID." };
  }

  console.log(">>> IG kontejner vytvořen, creation_id:", creationId);

  // Wait for Instagram to process the media
  const waitMs = mediaType === "video" ? 10_000 : 3_000;
  await new Promise((r) => setTimeout(r, waitMs));

  // --- Phase 2: Publish Container ---
  console.log(">>> Publikuji IG kontejner...", { creationId });

  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", creationId);
  publishBody.set("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
  });

  const publishPayload = await publishRes.json().catch(() => ({}));
  console.log("🔥 META RESPONSE (IG publish):", { status: publishRes.status, payload: publishPayload });

  if (!publishRes.ok) {
    const publishErr = typeof publishPayload?.error?.message === "string" ? publishPayload.error.message : `IG publish failed (${publishRes.status})`;
    return { success: false, error: publishErr };
  }

  // Instagram media_publish returns { "id": "17841405876543214" }
  // This is the actual post ID on Instagram – we MUST store it for deletion.
  const publishedId = typeof publishPayload?.id === "string" ? publishPayload.id : undefined;

  if (publishedId) {
    console.log("🔥 IG PUBLISH SUCCESS, final external_id:", publishedId);
    return { success: true, externalId: publishedId };
  }

  // Fallback: if media_publish returned OK but no 'id', use creation_id.
  // This can happen with certain Meta API versions. creation_id is still usable
  // for deletion via Graph API.
  console.warn("⚠️ IG publish returned no 'id' – falling back to creation_id:", creationId);
  return { success: true, externalId: creationId };
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

  const { data: platformsToPublish, error: platformsError } = await supabaseAdmin
    .from("post_platforms")
    .select("id, post_id, platform, status, scheduled_at, posts(id, user_id, content, media_urls, location, tags)")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (platformsError) {
    console.log("process-scheduled-posts query error", { message: platformsError.message });
    return Response.json({ error: platformsError.message }, { status: 500 });
  }

  console.log(`>>> Found ${platformsToPublish?.length ?? 0} scheduled post_platforms(s) to process`);

  if (!platformsToPublish || platformsToPublish.length === 0) {
    console.log(">>> No scheduled post_platforms to process, exiting early");
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

  // Lock all selected platforms immediately to prevent duplicate processing
  // If another instance of this function runs at the same time, it won't find these
  const ppIds = platformsToPublish.map((p) => p.id);
  console.log(`>>> Locking ${ppIds.length} post_platforms(s): scheduled → publishing`, { ppIds });

  const { error: lockError } = await supabaseAdmin
    .from("post_platforms")
    .update({ status: "publishing" })
    .in("id", ppIds)
    .eq("status", "scheduled");

  if (lockError) {
    console.log(">>> Failed to lock post_platforms", { error: lockError.message });
    return Response.json(
      { error: "Failed to lock post_platforms for processing", detail: lockError.message },
      { status: 500 }
    );
  }

  console.log(`>>> post_platforms locked successfully. Starting publish process...`);

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const pp of platformsToPublish) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const post = Array.isArray(pp.posts) ? pp.posts[0] : pp.posts;
      if (!post) {
        console.log(`>>> Post data missing for post_platforms ${pp.id}`);
        continue;
      }

      console.log(`>>> Processing post_platforms: ${pp.id} (Post: ${post.id}, Platform: ${pp.platform})`, {
        hasMedia: Array.isArray(post.media_urls) && post.media_urls.length > 0,
        scheduledAt: pp.scheduled_at,
      });

      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
      const rawContent = String(post.content ?? "");
      const rawLocation = (post as { location?: string | null }).location ?? null;
      const rawTags = (Array.isArray((post as { tags?: unknown }).tags) ? (post as { tags?: string[] }).tags : []) ?? [];

      // Build final caption: content + location + hashtags
      const finalCaption = buildFinalCaption({
        content: rawContent,
        location: rawLocation,
        tags: rawTags,
      });

      let externalId: string | null = null;
      let publishError: string | null = null;

      const targetPlatform = pp.platform;

      if (targetPlatform === "instagram") {
        // --- Instagram publish ---
        console.log(`>>> Hledám Instagram účet pro user_id: ${post.user_id}`);

        const { data: igAccounts, error: igAccountError } = await supabaseAdmin
          .from("social_accounts")
          .select("access_token, platform_id")
          .eq('user_id', post.user_id)
          .ilike('platform', 'instagram')
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log(`>>> Instagram account lookup result:`, {
          igAccountError,
          accountsFound: igAccounts?.length ?? 0,
        });

        if (igAccountError || !igAccounts?.[0]?.access_token || !igAccounts?.[0]?.platform_id) {
          publishError = igAccountError?.message ?? "Chybí propojený Instagram účet (platform_id / access_token).";
          console.log(`>>> Instagram account error for post ${post.id}`, { error: publishError });
        } else {
          const igAccount = igAccounts[0];
          const result = await publishToInstagram(
            igAccount.access_token,
            igAccount.platform_id,
            finalCaption,
            mediaUrls
          );

          if (!result.success) {
            publishError = result.error ?? "Instagram publish failed";
            console.log(`>>> Instagram publish failed for post ${post.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> Instagram publish success for post ${post.id}`, { externalId });
          }
        }
      } else if (targetPlatform === "facebook") {
        // --- Facebook publish ---
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
            console.log(`>>> Facebook account error for post_platforms ${pp.id}`, { error: publishError });
          }
        } else {
          const account = accounts[0];
          const mediaType = detectMediaType(mediaUrls);
          const filteredUrls = mediaType === "text" ? [] : mediaUrls;

          const result = await publishToFacebook(
            account.access_token,
            account.platform_id,
            finalCaption,
            mediaType,
            filteredUrls
          );

          if (!result.success) {
            publishError = result.error ?? "Facebook publish failed";
            console.log(`>>> Facebook publish failed for post_platforms ${pp.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> Facebook publish success for post_platforms ${pp.id}`, { externalId });
          }
        }
      } else {
        publishError = `Unsupported platform: ${targetPlatform}`;
      }

      console.log(`🚀 ARCHITEKTURA: Aktualizuji post_platforms ${targetPlatform} -> ${publishError ? 'failed' : 'published'}`);

      const ppUpdateValues: Record<string, unknown> = {
        status: publishError ? "failed" : "published",
        published_at: publishError ? null : nowIso,
        external_id: externalId,
        publish_error: publishError ?? null,
      };

      const { error: ppUpdateError } = await supabaseAdmin
        .from("post_platforms")
        .update(ppUpdateValues)
        .eq("id", pp.id)
        .eq("status", "publishing");

      if (ppUpdateError) {
        failed += 1;
        console.log("process-scheduled-posts update post_platforms failed", {
          ppId: pp.id,
          message: ppUpdateError.message,
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
        ppId: pp.id,
        message: errorMsg,
      });

      await supabaseAdmin
        .from("post_platforms")
        .update({ status: "failed", publish_error: errorMsg })
        .eq("id", pp.id)
        .eq("status", "publishing");
    }
  }

  console.log("process-scheduled-posts done", {
    totalFound: platformsToPublish?.length ?? 0,
    published,
    skipped,
    failed,
  });

  return Response.json(
    {
      ok: true,
      now: nowIso,
      totalFound: platformsToPublish?.length ?? 0,
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
