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
  const rawUrls = ((post as { media_urls?: unknown }).media_urls as string[] | undefined) ?? [];
  const mediaType = getFacebookMediaType(rawUrls);
  const photoUrls = mediaType === "photo" ? rawUrls.filter((u) => typeof u === "string" && u.trim()) : [];

  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(platformId)}`;

  let facebookPostId: string | null = null;

  try {
    if (mediaType === "video") {
      // Single video publish
      const mediaUrl = String(rawUrls[0] ?? "");
      const url = `${base}/videos`;
      const body = new URLSearchParams();
      body.set("file_url", mediaUrl);
      body.set("description", content);
      body.set("access_token", pageToken);

      console.log("ODESÍLÁM VIDEO NA FACEBOOK...", { platform_id: platformId, mediaUrl, url });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (video):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else if (mediaType === "photo" && photoUrls.length > 1) {
      // Multi-photo: upload each as unpublished, then publish via /feed with attached_media
      console.log("Nahrávám galerii s počtem fotek:", photoUrls.length);
      console.log("ODESÍLÁM GALERII FOTEK NA FACEBOOK...", { platform_id: platformId, count: photoUrls.length });

      const mediaIds: string[] = [];
      for (let i = 0; i < photoUrls.length; i++) {
        const uploadBody = new URLSearchParams();
        uploadBody.set("url", photoUrls[i]);
        uploadBody.set("published", "false");
        uploadBody.set("access_token", pageToken);

        const uploadRes = await fetch(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: uploadBody,
          cache: "no-store",
        });

        const uploadPayload = (await uploadRes.json().catch(async () => ({ raw: await uploadRes.text().catch(() => "") }))) as FacebookPublishResponse;
        console.log(`META UPLOAD photo ${i + 1}:`, uploadPayload);

        const uploadErr = getGraphErrorMessage(uploadPayload);
        if (uploadErr) throw new Error(`Upload photo ${i + 1} failed: ${uploadErr}`);

        const photoId = getGraphResponseId(uploadPayload);
        if (!photoId) throw new Error(`Upload photo ${i + 1} returned no ID.`);
        mediaIds.push(photoId);
      }

      // Publish feed post with attached_media (correct format: [{media_fbid: id}, ...])
      const feedBody = new URLSearchParams();
      feedBody.set("message", content);
      feedBody.set("attached_media", JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))));
      feedBody.set("access_token", pageToken);

      console.log("PUBLIKUJI GALERII...", { mediaIds, attached_media: JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))) });
      const feedRes = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: feedBody,
        cache: "no-store",
      });

      const feedPayload = (await feedRes.json().catch(async () => ({ raw: await feedRes.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (gallery feed):", feedPayload);

      const feedErr = getGraphErrorMessage(feedPayload);
      if (feedErr) throw new Error(feedErr);
      facebookPostId = getGraphResponseId(feedPayload);

    } else if (mediaType === "photo" && photoUrls.length === 1) {
      // Single photo publish (fast path)
      const url = `${base}/photos`;
      const body = new URLSearchParams();
      body.set("url", photoUrls[0]);
      body.set("caption", content);
      body.set("access_token", pageToken);

      console.log("ODESÍLÁM FOTO NA FACEBOOK...", { platform_id: platformId, mediaUrl: photoUrls[0], url });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (photo):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else {
      // Text-only publish
      const feedUrl = `${base}/feed`;
      const body = new URLSearchParams();
      body.set("message", content);
      body.set("access_token", pageToken);

      console.log("ODESÍLÁM TEXT NA FACEBOOK...", { platform_id: platformId, text: content, url: feedUrl });
      const res = await fetch(feedUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (text):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);
    }

    // Only mark as published if we got a valid post ID
    if (!facebookPostId) {
      throw new Error("Meta Graph API returned no post ID.");
    }

    const publishedAt = new Date().toISOString();
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: post.id,
      values: {
        status: "published",
        scheduled_at: null,
        published_at: publishedAt,
        external_id: facebookPostId,
        publish_error: null,
      },
    });

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return {
      success: true,
      data: { facebookPostId },
    };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "Unknown error while publishing to Facebook.";

    console.error("FACEBOOK PUBLISH ERROR:", errorMessage);

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
