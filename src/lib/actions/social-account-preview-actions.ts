"use server";

import { createClient } from "@/lib/supabase/server";
import {
  PREVIEWABLE_PLATFORMS,
  mapSocialAccountForPreview,
  normalizeTikTokHandle,
  resolveTikTokUsername,
  type SafeSocialAccount,
} from "@/lib/social-account-preview";

// Columns read server-side only. `metadata` never leaves the server: the
// actions below extract at most the cached TikTok handle from it and return
// the sanitized shape from `@/lib/social-account-preview`.
const SELECT_COLUMNS = "platform, account_name, avatar_url, metadata";

/**
 * TikTok handle for the "Open on network" URL in the edit dialog.
 *
 * Runs server-side with the standard Supabase client (RLS) and an explicit
 * `user_id` filter — no service key, no unfiltered query. Returns only the
 * normalized handle (or `null`), never the row or its metadata.
 */
export async function getTikTokUsernameAction(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("social_accounts")
    .select(SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("platform", "tiktok")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeTikTokHandle(resolveTikTokUsername(data));
}

/**
 * Display data for the preview dialog: one entry per connected, active
 * account on a previewable platform.
 *
 * Mirrors what the dialog used to fetch in the browser, but without
 * `metadata` — the TikTok handle is resolved here, so TikTok `refresh_token`,
 * Facebook Page `access_token` and YouTube `refresh_token` stay on the server.
 */
export async function getPreviewAccountsAction(): Promise<SafeSocialAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("social_accounts")
    .select(SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("platform", [...PREVIEWABLE_PLATFORMS]);

  if (error || !data) return [];

  return data.map(mapSocialAccountForPreview);
}