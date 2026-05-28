"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const LOCALES = ["cs", "en", "uk"] as const;

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

type FacebookPublishResponse =
  | { id: string }
  | { error?: { message?: string } }
  | Record<string, unknown>;

type FacebookPublishMediaType = "text" | "photo" | "video";

function getFacebookMediaType(mediaUrls: unknown): FacebookPublishMediaType {
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

function getGraphErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

function getGraphResponseId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id : null;
}

async function updatePostPublishState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    userId: string;
    postId: string;
    values: Record<string, unknown>;
  }
) {
  const attempt = await supabase
    .from("posts")
    .update(input.values)
    .eq("id", input.postId)
    .eq("user_id", input.userId);

  if (!attempt.error) return;

  const msg = String(attempt.error.message || "");
  if (!msg.toLowerCase().includes("publish_error")) return;

  if (!Object.prototype.hasOwnProperty.call(input.values, "publish_error")) return;
  const valuesWithoutPublishError = { ...input.values };
  delete (valuesWithoutPublishError as Record<string, unknown>).publish_error;

  await supabase
    .from("posts")
    .update(valuesWithoutPublishError)
    .eq("id", input.postId)
    .eq("user_id", input.userId);
}

export async function publishToFacebook(input: { postId: string }): Promise<{
  success: boolean;
  data?: { facebookPostId?: string };
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();
  console.log("HLEDÁM ÚČET PRO USERA:", user.id);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, platforms, media_urls")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const { data: accounts, error: accountError } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token, platform_id, platform")
    .eq("user_id", user.id)
    .ilike("platform", "facebook")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (accountError) {
    console.error("CHYBA PŘI HLEDÁNÍ ÚČTU:", accountError.message);
    const allAccounts = await supabaseAdmin.from("social_accounts").select("*");
    console.log("DEBUG - Všechny účty v DB:", allAccounts.data);
    return { success: false, error: accountError.message };
  }

  const account = accounts?.[0];
  console.log("NALEZENÝ ÚČET:", account);
  const pageToken = account?.access_token;
  const platformId = account?.platform_id;

  if (!pageToken || !platformId) {
    console.log("DEBUG - Údaje účtu:", { pageToken: !!pageToken, platformId: !!platformId, accounts: accounts });
    const allAccounts = await supabaseAdmin.from("social_accounts").select("*");
    console.log("DEBUG - Všechny účty v DB (chybí token/id):", allAccounts.data);
    return {
      success: false,
      error: "Chybí propojený Facebook účet (platform_id / access_token).",
    };
  }

  const content = String(post.content ?? "");
  const mediaType = getFacebookMediaType((post as { media_urls?: unknown }).media_urls);
  const mediaUrl =
    mediaType === "text"
      ? null
      : String(((post as { media_urls?: unknown }).media_urls as unknown[] | undefined)?.[0] ?? "");

  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(platformId)}`;
  const url =
    mediaType === "video"
      ? `${base}/videos`
      : mediaType === "photo"
        ? `${base}/photos`
        : `${base}/feed`;

  const body = new URLSearchParams();
  if (mediaType === "video") {
    body.set("file_url", String(mediaUrl ?? ""));
    body.set("description", content);
  } else if (mediaType === "photo") {
    body.set("url", String(mediaUrl ?? ""));
    body.set("caption", content);
  } else {
    body.set("message", content);
  }
  body.set("access_token", pageToken);

  let responsePayload: FacebookPublishResponse | null = null;
  try {
    console.log("ODESÍLÁM NA FACEBOOK...", { platform_id: platformId, text: content, mediaType, mediaUrl, url });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    responsePayload = (await res
      .json()
      .catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
    console.log("META RESPONSE:", responsePayload);

    const apiErrorMessage = getGraphErrorMessage(responsePayload) ??
      (!res.ok ? `Meta Graph API request failed (${res.status}).` : null);

    if (apiErrorMessage) {
      const errorMessage = String(apiErrorMessage);
      await updatePostPublishState(supabase, {
        userId: user.id,
        postId: post.id,
        values: {
          status: "failed",
          publish_error: errorMessage,
          published_at: null,
        },
      });

      revalidateAllLocales("/calendar");
      revalidateAllLocales("/posts");
      revalidateAllLocales("/dashboard");

      return { success: false, error: errorMessage };
    }

    const facebookPostId = getGraphResponseId(responsePayload) ?? "";

    const publishedAt = new Date().toISOString();
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: post.id,
      values: {
        status: "published",
        scheduled_at: null,
        published_at: publishedAt,
        external_id: facebookPostId || null,
        publish_error: null,
      },
    });

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return {
      success: true,
      data: { facebookPostId: facebookPostId || undefined },
    };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "Unknown error while publishing to Facebook.";

    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: post.id,
      values: {
        status: "failed",
        publish_error: errorMessage,
        published_at: null,
      },
    });

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return { success: false, error: errorMessage };
  }
}
