"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const LOCALES = ["cs", "en", "uk"];

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

export async function createPostAction(data: {
  content: string;
  platforms: string[];
  scheduledAt?: string | null;
  status: "draft" | "scheduled" | "published";
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a post." };
  }

  if (data.status === "scheduled") {
    if (!data.scheduledAt) {
      console.log("SCHEDULE ERROR: Chybí scheduledAt");
      return { success: false, error: "Pro naplánování vyber datum a čas publikování." };
    }
    const scheduled = new Date(data.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      console.log("SCHEDULE ERROR: Neplatné datum:", data.scheduledAt);
      return { success: false, error: "Neplatné datum naplánování." };
    }
    if (scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
      console.log("SCHEDULE ERROR: Čas je v minulosti (>5 min):", data.scheduledAt, "now:", new Date().toISOString());
      return { success: false, error: "Naplánovaný čas musí být v budoucnosti." };
    }
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: data.content,
      platforms: data.platforms,
      scheduled_at: data.scheduledAt,
      status: data.status,
      media_urls: data.mediaUrls ?? [],
      location: data.location ?? null,
      tags: data.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { success: false, error: error.message };
  }

  if (data.status === "scheduled") {
    console.log("PŘÍSPĚVEK NAPLÁNOVÁN:", post.id, "status:", data.status, "scheduled_at:", data.scheduledAt);
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, data: post };
}

export async function updatePost(id: string, data: {
  content?: string;
  platforms?: string[];
  scheduledAt?: string | null;
  status?: "draft" | "scheduled" | "publishing" | "published" | "failed";
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
}) {
  const supabase = await createClient();

  if (data.status === "scheduled") {
    if (data.scheduledAt === null) {
      return { success: false, error: "Pro naplánování vyber datum a čas publikování." };
    }
    if (typeof data.scheduledAt === "string") {
      const scheduled = new Date(data.scheduledAt);
      if (Number.isNaN(scheduled.getTime())) {
        return { success: false, error: "Neplatné datum naplánování." };
      }
      if (scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
        return { success: false, error: "Naplánovaný čas musí být v budoucnosti." };
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.content !== undefined) updateData.content = data.content;
  if (data.platforms !== undefined) updateData.platforms = data.platforms;
  if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.mediaUrls !== undefined) updateData.media_urls = data.mediaUrls;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.tags !== undefined) updateData.tags = data.tags;

  const { data: post, error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating post:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, data: post };
}

export async function deletePost(id: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to delete a post." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, platforms, external_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const externalId =
    typeof post.external_id === "string" && post.external_id.trim()
      ? post.external_id.trim()
      : null;

  if (externalId && platforms.includes("facebook")) {
    const { data: accounts, error: accountError } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("platform", "facebook")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (accountError) {
      return { success: false, error: accountError.message };
    }

    const pageToken =
      typeof accounts?.[0]?.access_token === "string" && accounts[0].access_token.trim()
        ? accounts[0].access_token.trim()
        : null;

    if (!pageToken) {
      return { success: false, error: "Chybí Page Access Token pro smazání z Facebooku." };
    }

    const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
    graphUrl.searchParams.set("access_token", pageToken);

    const graphRes = await fetch(graphUrl, { method: "DELETE", cache: "no-store" });
    const graphPayload = (await graphRes.json().catch(() => null)) as
      | { success?: boolean; error?: { message?: string } }
      | null;

    const graphErrorMessage =
      graphPayload?.error?.message ??
      (!graphRes.ok ? `Meta Graph API delete failed (${graphRes.status}).` : null);

    if (graphErrorMessage) {
      return { success: false, error: graphErrorMessage };
    }
  }

  const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

export async function getPosts(status?: string) {
  const supabase = await createClient();

  let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

export async function getPost(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
