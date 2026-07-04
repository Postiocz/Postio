"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  isTikTokSandboxPrivateOnlyError,
  TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE,
} from "@/lib/tiktok-publish-errors";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const TIKTOK_PUBLISH_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_PUBLISH_STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const TIKTOK_STATUS_POLL_INTERVAL_MS = 2_500;
const TIKTOK_STATUS_MAX_WAIT_MS = 3 * 60 * 1000;
const TIKTOK_PRIVATE_ONLY_WARNING_CODE = "tiktok_private_only";

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "SELF_ONLY"
  | "FOLLOWER_OF_CREATOR";

type TikTokPublishStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_DOWNLOAD"
  | "SEND_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

export type TikTokCreatorInfo = {
  creatorAvatarUrl: string | null;
  creatorUsername: string | null;
  creatorNickname: string | null;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
  fetchedAt: string;
};

type SocialAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

type TikTokStatusFetchResponse = {
  data?: {
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: Array<number | string>;
    uploaded_bytes?: number;
    downloaded_bytes?: number;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type TikTokCreatorInfoResponse = {
  data?: {
    creator_avatar_url?: string;
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type TikTokPostSettings = {
  privacyLevel?: TikTokPrivacyLevel;
};

type TikTokPublishActionResult =
  | {
      success: true;
      externalId: string;
      effectivePrivacyLevel: TikTokPrivacyLevel;
      warningCode?: typeof TIKTOK_PRIVATE_ONLY_WARNING_CODE;
    }
  | { success: false; error: string; errorCode?: string };

function readTikTokRefreshToken(metadata: SocialAccountRow["metadata"]): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.refresh_token;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isTikTokDevelopmentMode(): boolean {
  if (isTruthyEnvFlag(process.env.TIKTOK_FORCE_PRIVATE_POSTS)) {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.toLowerCase() ?? "";
  if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    return true;
  }

  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase();
  if (vercelEnv && vercelEnv !== "production") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

function readTikTokPostSettings(
  metadata: Record<string, unknown> | null | undefined,
): TikTokPostSettings {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const privacyLevel = metadata.privacy_level;
  if (
    privacyLevel === "PUBLIC_TO_EVERYONE" ||
    privacyLevel === "MUTUAL_FOLLOW_FRIENDS" ||
    privacyLevel === "SELF_ONLY" ||
    privacyLevel === "FOLLOWER_OF_CREATOR"
  ) {
    return { privacyLevel };
  }

  return {};
}

function normalizeTikTokCreatorInfo(payload: TikTokCreatorInfoResponse): TikTokCreatorInfo {
  const data = payload.data ?? {};
  const privacyLevelOptions = Array.isArray(data.privacy_level_options)
    ? data.privacy_level_options.filter(
        (value): value is TikTokPrivacyLevel =>
          value === "PUBLIC_TO_EVERYONE" ||
          value === "MUTUAL_FOLLOW_FRIENDS" ||
          value === "SELF_ONLY" ||
          value === "FOLLOWER_OF_CREATOR",
      )
    : [];

  return {
    creatorAvatarUrl: data.creator_avatar_url ?? null,
    creatorUsername: data.creator_username ?? null,
    creatorNickname: data.creator_nickname ?? null,
    privacyLevelOptions,
    commentDisabled: Boolean(data.comment_disabled),
    duetDisabled: Boolean(data.duet_disabled),
    stitchDisabled: Boolean(data.stitch_disabled),
    maxVideoPostDurationSec:
      typeof data.max_video_post_duration_sec === "number"
        ? data.max_video_post_duration_sec
        : null,
    fetchedAt: new Date().toISOString(),
  };
}

function isTikTokPrivateOnlyCreatorInfo(creatorInfo: TikTokCreatorInfo): boolean {
  return (
    creatorInfo.privacyLevelOptions.length === 1 &&
    creatorInfo.privacyLevelOptions[0] === "SELF_ONLY"
  );
}

async function persistTikTokCreatorInfoCache(params: {
  accountId: string;
  existingMetadata: Record<string, unknown> | null;
  creatorInfo: TikTokCreatorInfo;
}) {
  const supabaseAdmin = createAdminClient();
  const nextMetadata = {
    ...(params.existingMetadata ?? {}),
    creator_info_cache: {
      creator_avatar_url: params.creatorInfo.creatorAvatarUrl,
      creator_username: params.creatorInfo.creatorUsername,
      creator_nickname: params.creatorInfo.creatorNickname,
      privacy_level_options: params.creatorInfo.privacyLevelOptions,
      comment_disabled: params.creatorInfo.commentDisabled,
      duet_disabled: params.creatorInfo.duetDisabled,
      stitch_disabled: params.creatorInfo.stitchDisabled,
      max_video_post_duration_sec: params.creatorInfo.maxVideoPostDurationSec,
      fetched_at: params.creatorInfo.fetchedAt,
    },
  };

  await supabaseAdmin
    .from("social_accounts")
    .update({ metadata: nextMetadata })
    .eq("id", params.accountId);
}

async function exchangeTikTokRefreshToken(refreshToken: string): Promise<
  | { success: true; accessToken: string; expiresInSeconds: number; refreshToken?: string }
  | { success: false; error: string }
> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return { success: false, error: "TikTok API není nakonfigurováno (chybí TIKTOK_CLIENT_KEY/SECRET)." };
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const res = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error_description?: string;
      error?: string;
    };

    if (!res.ok || !payload.access_token) {
      return {
        success: false,
        error: payload.error_description || payload.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      // TikTok typically returns a 24h access token here as well. Treat
      // `expires_in` strictly as a relative duration in seconds.
      expiresInSeconds:
        typeof payload.expires_in === "number" ? payload.expires_in : 86400,
      refreshToken: payload.refresh_token,
    };
  } catch (e) {
    return {
      success: false,
      error: `TikTok refresh failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function getValidTikTokAccessToken(params: { account: SocialAccountRow }) {
  const { account } = params;
  const supabaseAdmin = createAdminClient();
  const now = Date.now();
  const expiresAtMs = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;

  if (account.access_token && expiresAtMs - now > TOKEN_REFRESH_BUFFER_MS) {
    return { success: true as const, accessToken: account.access_token, account };
  }

  const refreshToken = readTikTokRefreshToken(account.metadata);
  if (!refreshToken) return { success: false as const, error: "Chybí refresh_token pro TikTok." };

  const refreshed = await exchangeTikTokRefreshToken(refreshToken);
  if (!refreshed.success) return refreshed;

  const newExpiresAt = new Date(now + refreshed.expiresInSeconds * 1000).toISOString();
  const newMetadata = {
    ...(account.metadata ?? {}),
    refresh_token: refreshed.refreshToken || refreshToken,
  };

  await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
      metadata: newMetadata,
    })
    .eq("id", account.id);

  return {
    success: true as const,
    accessToken: refreshed.accessToken,
    account: {
      ...account,
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
      metadata: newMetadata,
    },
  };
}

async function queryTikTokCreatorInfo(params: {
  accessToken: string;
}): Promise<{ success: true; data: TikTokCreatorInfo } | { success: false; error: string }> {
  try {
    const res = await fetch(TIKTOK_CREATOR_INFO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => ({}))) as TikTokCreatorInfoResponse;
    if (!res.ok || payload.error?.code !== "ok") {
      return {
        success: false,
        error: payload.error?.message || `TikTok creator_info/query selhalo (HTTP ${res.status}).`,
      };
    }

    return {
      success: true,
      data: normalizeTikTokCreatorInfo(payload),
    };
  } catch (error) {
    return {
      success: false,
      error: `TikTok creator_info/query selhalo: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

function inferVideoMimeType(url: string): string {
  const cleanUrl = url.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUrl.endsWith(".mov")) return "video/quicktime";
  if (cleanUrl.endsWith(".webm")) return "video/webm";
  if (cleanUrl.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

function resolveRequestedPrivacyLevel(params: {
  requestedPrivacyLevel?: TikTokPrivacyLevel;
  creatorInfo: TikTokCreatorInfo;
}): TikTokPrivacyLevel {
  const { requestedPrivacyLevel, creatorInfo } = params;

  if (isTikTokDevelopmentMode() || isTikTokPrivateOnlyCreatorInfo(creatorInfo)) {
    return "SELF_ONLY";
  }

  if (
    requestedPrivacyLevel &&
    creatorInfo.privacyLevelOptions.includes(requestedPrivacyLevel)
  ) {
    return requestedPrivacyLevel;
  }

  const preferredFallbackOrder: TikTokPrivacyLevel[] = [
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "SELF_ONLY",
    "FOLLOWER_OF_CREATOR",
  ];

  return (
    preferredFallbackOrder.find((level) =>
      creatorInfo.privacyLevelOptions.includes(level),
    ) ??
    creatorInfo.privacyLevelOptions[0] ??
    "SELF_ONLY"
  );
}

async function waitForTikTokPublishComplete(params: {
  accessToken: string;
  publishId: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<
  | { success: true; publicPostId: string | null }
  | { success: false; error: string }
> {
  const {
    accessToken,
    publishId,
    pollIntervalMs = TIKTOK_STATUS_POLL_INTERVAL_MS,
    maxWaitMs = TIKTOK_STATUS_MAX_WAIT_MS,
  } = params;
  const start = Date.now();

  while (Date.now() - start <= maxWaitMs) {
    try {
      const res = await fetch(TIKTOK_PUBLISH_STATUS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
        cache: "no-store",
      });

      const payload = (await res.json().catch(() => ({}))) as TikTokStatusFetchResponse;
      if (!res.ok || payload.error?.code !== "ok") {
        return {
          success: false,
          error:
            payload.error?.message ||
            `TikTok status/fetch selhalo pro publish_id ${publishId} (HTTP ${res.status}).`,
        };
      }

      const status = payload.data?.status as TikTokPublishStatus | undefined;
      if (status === "PUBLISH_COMPLETE") {
        const publicPostId = payload.data?.publicaly_available_post_id?.[0];
        return {
          success: true,
          publicPostId:
            publicPostId !== undefined && publicPostId !== null
              ? String(publicPostId)
              : null,
        };
      }

      if (status === "FAILED") {
        return {
          success: false,
          error:
            payload.data?.fail_reason ||
            "TikTok zpracování videa skončilo stavem FAILED.",
        };
      }
    } catch (error) {
      console.warn("[TikTok status/fetch] transient poll error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    success: false,
    error: "TikTok status polling vypršel dříve, než video přešlo do stavu PUBLISH_COMPLETE.",
  };
}

async function publishToTikTok(params: {
  accessToken: string;
  videoUrl: string;
  content: string;
  privacyLevel: TikTokPrivacyLevel;
  creatorInfo: TikTokCreatorInfo;
}): Promise<
  | { success: true; externalId: string }
  | { success: false; error: string; errorCode?: string }
> {
  const { accessToken, videoUrl, content, privacyLevel, creatorInfo } = params;

  let videoBuffer: ArrayBuffer;
  try {
    const sourceRes = await fetch(videoUrl, { cache: "no-store" });
    if (!sourceRes.ok) {
      return {
        success: false,
        error: `TikTok video se nepodařilo stáhnout (HTTP ${sourceRes.status}).`,
      };
    }
    videoBuffer = await sourceRes.arrayBuffer();
  } catch (e) {
    return {
      success: false,
      error: `Síťová chyba při stahování TikTok videa: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  if (videoBuffer.byteLength === 0) {
    return {
      success: false,
      error: "TikTok video soubor je prázdný (0 bytů).",
    };
  }

  const body = {
    post_info: {
      title: content.slice(0, 2200),
      privacy_level: privacyLevel,
      disable_duet: creatorInfo.duetDisabled,
      disable_comment: creatorInfo.commentDisabled,
      disable_stitch: creatorInfo.stitchDisabled,
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoBuffer.byteLength,
      chunk_size: videoBuffer.byteLength,
      total_chunk_count: 1,
    },
  };

  console.log("TIKTOK PAYLOAD:", body);

  const initRes = await fetch(TIKTOK_PUBLISH_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const initData = (await initRes.json().catch(() => ({}))) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };

  if (!initRes.ok || initData.error?.code !== "ok") {
    console.error("[TikTok Publish] init error:", initData);
    const initErrorCode = initData.error?.code;
    const errorMessage = initData.error?.message || "TikTok publish init selhalo.";
    return {
      success: false,
      error: errorMessage,
      ...(isTikTokSandboxPrivateOnlyError(initErrorCode) ||
      isTikTokSandboxPrivateOnlyError(errorMessage)
        ? { errorCode: TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE }
        : {}),
    };
  }

  const publishId = initData.data?.publish_id;
  const uploadUrl = initData.data?.upload_url;

  if (!publishId || !uploadUrl) {
    return {
      success: false,
      error: "TikTok publish init nevrátil publish_id nebo upload_url.",
    };
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": inferVideoMimeType(videoUrl),
      "Content-Length": String(videoBuffer.byteLength),
      "Content-Range": `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
    },
    body: videoBuffer,
    cache: "no-store",
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text().catch(() => "");
    return {
      success: false,
      error: `TikTok binary upload failed (HTTP ${uploadRes.status})${
        errorText ? `: ${errorText.slice(0, 200)}` : ""
      }`,
    };
  }

  const statusResult = await waitForTikTokPublishComplete({
    accessToken,
    publishId,
  });
  if (!statusResult.success) {
    return statusResult;
  }

  return {
    success: true,
    externalId: statusResult.publicPostId ?? publishId,
  };
}

export async function getTikTokCreatorInfoAction(): Promise<
  | { success: true; data: TikTokCreatorInfo }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();
  const { data: accounts } = await supabaseAdmin
    .from("social_accounts")
    .select("id, user_id, platform, access_token, token_expires_at, metadata")
    .eq("user_id", user.id)
    .ilike("platform", "tiktok")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const account = accounts?.[0] as SocialAccountRow | undefined;
  if (!account) {
    return { success: false, error: "Chybí propojený TikTok účet." };
  }

  const tokenResult = await getValidTikTokAccessToken({ account });
  if (!tokenResult.success) return tokenResult;

  const creatorInfoResult = await queryTikTokCreatorInfo({
    accessToken: tokenResult.accessToken,
  });
  if (!creatorInfoResult.success) return creatorInfoResult;

  await persistTikTokCreatorInfoCache({
    accountId: tokenResult.account.id,
    existingMetadata: tokenResult.account.metadata,
    creatorInfo: creatorInfoResult.data,
  });

  return creatorInfoResult;
}

export async function publishToTikTokAction(params: {
  account: SocialAccountRow;
  content: string;
  mediaUrls: string[];
  existingExternalId?: string | null;
  platformMetadata?: Record<string, unknown> | null;
}): Promise<TikTokPublishActionResult> {
  const { account, content, mediaUrls, existingExternalId, platformMetadata } = params;

  if (typeof existingExternalId === "string" && existingExternalId.trim()) {
    console.warn(
      `[publishToTikTokAction] Refusing duplicate upload – post already has TikTok external_id=${existingExternalId}`,
    );
    return {
      success: false,
      error: "Příspěvek je již publikován na TikTok (duplicate upload blocked).",
    };
  }

  const videoUrl = mediaUrls.find((u) => typeof u === "string" && u.trim());
  if (!videoUrl) return { success: false, error: "TikTok vyžaduje alespoň jedno video." };

  const cleanUrl = videoUrl.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
  const looksLikeVideo =
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mkv");

  if (!looksLikeVideo) {
    return {
      success: false,
      error: "TikTok vyžaduje video soubor (mp4/mov/m4v/webm/mkv).",
    };
  }

  const tokenResult = await getValidTikTokAccessToken({ account });
  if (!tokenResult.success) return tokenResult;

  const creatorInfoResult = await queryTikTokCreatorInfo({
    accessToken: tokenResult.accessToken,
  });
  if (!creatorInfoResult.success) return creatorInfoResult;

  await persistTikTokCreatorInfoCache({
    accountId: tokenResult.account.id,
    existingMetadata: tokenResult.account.metadata,
    creatorInfo: creatorInfoResult.data,
  });

  const requestedPrivacyLevel = readTikTokPostSettings(platformMetadata).privacyLevel;
  const resolvedPrivacyLevel = resolveRequestedPrivacyLevel({
    requestedPrivacyLevel,
    creatorInfo: creatorInfoResult.data,
  });
  const shouldWarnPrivateOnly =
    resolvedPrivacyLevel === "SELF_ONLY" &&
    (isTikTokDevelopmentMode() || isTikTokPrivateOnlyCreatorInfo(creatorInfoResult.data));

  const initialResult = await publishToTikTok({
    accessToken: tokenResult.accessToken,
    videoUrl,
    content,
    privacyLevel: resolvedPrivacyLevel,
    creatorInfo: creatorInfoResult.data,
  });

  if (initialResult.success) {
    return {
      success: true,
      externalId: initialResult.externalId,
      effectivePrivacyLevel: resolvedPrivacyLevel,
      ...(shouldWarnPrivateOnly ? { warningCode: TIKTOK_PRIVATE_ONLY_WARNING_CODE } : {}),
    };
  }

  if (
    resolvedPrivacyLevel !== "SELF_ONLY" &&
    isTikTokSandboxPrivateOnlyError(initialResult.error)
  ) {
    const retryResult = await publishToTikTok({
      accessToken: tokenResult.accessToken,
      videoUrl,
      content,
      privacyLevel: "SELF_ONLY",
      creatorInfo: creatorInfoResult.data,
    });

    if (retryResult.success) {
      return {
        success: true,
        externalId: retryResult.externalId,
        effectivePrivacyLevel: "SELF_ONLY",
        warningCode: TIKTOK_PRIVATE_ONLY_WARNING_CODE,
      };
    }

    return retryResult;
  }

  return initialResult;
}
