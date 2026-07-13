"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type PreviewPostPlatform = {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  created_at: string;
  updated_at: string;
};

export interface PreviewPostData {
  id: string;
  content: string;
  platforms: string[];
  post_platforms?: PreviewPostPlatform[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  media_urls: string[];
}

export interface PreviewProfile {
  displayName: string;
  avatarUrl?: string | null;
}

type PreviewPlatform = "facebook" | "instagram" | "youtube" | "linkedin" | "tiktok";

// ---------------------------------------------------------------------
// Platform icon map
// ---------------------------------------------------------------------

const PlatformIconMap: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

// Platforms that have a high-fidelity preview renderer
const PREVIEWABLE_PLATFORMS: PreviewPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
  "tiktok",
];

// Per-platform brand accents
const PLATFORM_ACCENTS: Record<PreviewPlatform, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  tiktok: "#00f2fe", // TikTok cyan
};

// Platform display labels (used when no translations are passed)
const PLATFORM_LABELS: Record<PreviewPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

// ---------------------------------------------------------------------
// PreviewDialog – standalone high-fidelity preview modal
//
// Opens from:
//  1. Eye icon on post cards (Posts page)
//  2. Clicking any post in Calendar (replaces edit dialog as default)
//
// Features:
//  - Dynamic tabs: only shows platforms the post is actually published to
//    (from post_platforms where status = 'published')
//  - "View Live" button: opens the real post on the social network
//  - High-fidelity preview: faithful mobile feed simulation
//  - No edit fields – pure visual inspection
// ---------------------------------------------------------------------

export function PreviewDialog({
  open,
  onOpenChange,
  post,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PreviewPostData | null;
  userId?: string;
}) {
  // #14 — Own i18n instead of props drilling (was labels prop with 8+ keys)
  const t = useTranslations("posts");
  // Load profiles for the preview avatars
  const [profiles, setProfiles] = useState<Record<string, PreviewProfile | null>>({
    facebook: null,
    instagram: null,
    youtube: null,
    linkedin: null,
    tiktok: null,
  });
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    if (!userId || !open || !post) return;
    let cancelled = false;
    const supabase = createClient();

    const loadProfiles = async () => {
      try {
        const [userRes, accountsRes] = await Promise.all([
          supabase
            .from("users")
            .select("full_name, avatar_url")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("social_accounts")
            .select("platform, account_name, avatar_url")
            .eq("user_id", userId)
            .eq("is_active", true)
            .in("platform", PREVIEWABLE_PLATFORMS),
        ]);
        if (cancelled) return;
        const fallbackName = userRes.data?.full_name ?? t("previewPlaceholderName");
        const fallbackAvatar = userRes.data?.avatar_url ?? null;
        const newProfiles: Record<string, PreviewProfile | null> = {};
        for (const p of PREVIEWABLE_PLATFORMS) {
          const acc = accountsRes.data?.find((a) => a.platform === p);
          newProfiles[p] = {
            displayName: acc?.account_name ?? fallbackName,
            avatarUrl: acc?.avatar_url ?? fallbackAvatar,
          };
        }
        setProfiles(newProfiles);
        setProfilesLoaded(true);
      } catch {
        // non-fatal – preview falls back to placeholder
        setProfilesLoaded(true);
      }
    };
    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [userId, open, post?.id, t]);

  // Determine which platforms have this post published
  const publishedPlatforms = useMemo<PreviewPostPlatform[]>(() => {
    // For archived (soft-deleted) posts, treat 'archived' platforms as
    // published so the high-fidelity preview renders instead of the
    // "not published" fallback message.
    if (!post?.post_platforms) return [];
    if (post.status === "archived") {
      return post.post_platforms.filter((p) => p.status === "archived");
    }
    return post.post_platforms.filter((p) => p.status === "published");
  }, [post?.post_platforms, post?.status]);

  // Filter to only previewable platforms that are actually published
  const availableTabs = useMemo<PreviewPlatform[]>(() => {
    return PREVIEWABLE_PLATFORMS.filter(
      (p) => publishedPlatforms.some((pp) => pp.platform === p)
    );
  }, [publishedPlatforms]);

  // Active tab state
  const firstTab = availableTabs[0] ?? "facebook";
  const [activeTab, setActiveTab] = useState<PreviewPlatform>(firstTab);

  // Reset active tab when available tabs change
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? "facebook");
    }
  }, [availableTabs, activeTab]);

  // Build live URL for the active platform
  const liveUrl = useMemo((): string | null => {
    const pp = publishedPlatforms.find((p) => p.platform === activeTab);
    if (!pp?.external_id) return null;
    return buildLiveUrl(activeTab, pp.external_id);
  }, [publishedPlatforms, activeTab]);

  // Resolve profile for active tab
  const activeProfile = useMemo((): PreviewProfile => {
    return profiles[activeTab] ?? { displayName: t("previewPlaceholderName") };
  }, [profiles, activeTab]);

  // Media items for preview
  const previewMedia = useMemo(() => {
    if (!post?.media_urls) return [];
    return post.media_urls.map((url) => ({
      previewUrl: url,
      kind: /\.(mp4|mov)(\?.*)?$/i.test(url) ? ("video" as const) : ("image" as const),
    }));
  }, [post?.media_urls]);

  // Tab label resolver
  const getTabLabel = useCallback(
    (p: PreviewPlatform): string => {
      const map: Record<PreviewPlatform, string> = {
        facebook: t("previewFacebookTab") ?? PLATFORM_LABELS.facebook,
        instagram: t("previewInstagramTab") ?? PLATFORM_LABELS.instagram,
        youtube: t("previewYoutubeTab") ?? PLATFORM_LABELS.youtube,
        linkedin: t("previewLinkedinTab") ?? PLATFORM_LABELS.linkedin,
        tiktok: t("previewTikTokTab") ?? PLATFORM_LABELS.tiktok,
      };
      return map[p];
    },
    [t],
  );

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="lg:max-w-[540px] sm:max-w-[480px] max-h-[85vh] bg-black/95 backdrop-blur-xl border border-white/10 rounded-[20px] p-0 overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header – fixed */}
        <DialogHeader className="px-4 pt-4 pb-1.5 flex-shrink-0">
          <DialogTitle className="text-xs font-medium text-muted-foreground/80">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* Body – scrollable only as safety net */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0 postio-scrollbar">
          {/* Platform tabs */}
          {availableTabs.length > 0 && (
            <div
              role="tablist"
              aria-label="Platform preview"
              className="inline-flex flex-wrap gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5"
            >
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab;
                const accent = PLATFORM_ACCENTS[tab];
                const Icon = PlatformIconMap[tab];
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative rounded-full px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1",
                      isActive ? "text-white" : "text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      isActive
                        ? { backgroundColor: `${accent}22`, color: accent }
                        : undefined
                    }
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {getTabLabel(tab)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Archived banner – shown only for historical/soft-deleted posts */}
          {post.status === "archived" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-medium">Historický záznam</span>
              <span className="text-amber-500/70 dark:text-amber-400/70">— tento příspěvek byl smazán</span>
            </div>
          )}

          {/* High-fidelity preview – max height on desktop, scroll as safety net */}
          {availableTabs.length > 0 ? (
            <div className="relative overflow-y-auto rounded-[20px] border border-white/5 bg-black max-h-[65vh] postio-scrollbar">
              {renderPreviewForPlatform(
                activeTab,
                post.content,
                previewMedia,
                activeProfile,
                post.location,
                t("previewCaptionHint"),
                t("previewNoMedia"),
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
              <Globe className="mb-2 h-7 w-7" />
              <p className="text-xs">{t("noPublishedPlatforms")}</p>
            </div>
          )}

          {/* View Live button – always visible without scrolling */}
          {liveUrl && (
            <div className="flex-shrink-0 pt-1">
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("viewLive")}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Build live URL for a published post
// ---------------------------------------------------------------------

function buildLiveUrl(platform: string, externalId: string | null): string | null {
  if (!externalId) return null;
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/${externalId}`;
    case "instagram":
      // external_id formats:
      //   - "shortcode|media_id" (new posts) — extract shortcode for URL
      //   - "shortcode" (if only shortcode was stored)
      //   - "1234567890" (old posts — numeric media ID only)
      const pipeIdx = externalId.indexOf("|");
      if (pipeIdx > 0) {
        // "shortcode|media_id" format
        const shortcode = externalId.slice(0, pipeIdx);
        return `https://www.instagram.com/p/${shortcode}/`;
      }
      if (/^\d+$/.test(externalId)) {
        // Numeric media ID — no shortcode available
        return `https://www.instagram.com/`;
      }
      // Plain shortcode
      return `https://www.instagram.com/p/${externalId}/`;
    case "linkedin":
      if (externalId.startsWith("urn:li:share:")) {
        return `https://www.linkedin.com/feed/update/${externalId}/`;
      }
      return `https://www.linkedin.com/feed/update/urn:li:share:${externalId}/`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${externalId}`;
    case "twitter":
    case "x":
      return `https://x.com/i/status/${externalId}`;
    case "tiktok":
      return `https://www.tiktok.com/@user/video/${externalId}`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------
// Avatar helper
// ---------------------------------------------------------------------

function AvatarInline({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------
// Media area helper
// ---------------------------------------------------------------------

function PreviewMediaArea({
  media,
  aspect,
  noMediaLabel,
}: {
  media: { previewUrl: string; kind: "image" | "video" }[];
  aspect: "square" | "feed" | "video";
  noMediaLabel: string;
}) {
  if (media.length === 0) {
    const emptyAspect = aspect === "video" ? "aspect-video" : "aspect-square";
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-white/[0.02] text-xs text-muted-foreground/50",
          emptyAspect,
        )}
      >
        {noMediaLabel}
      </div>
    );
  }
  const first = media[0];
  // Prompt 013 – object-contain + no forced aspect ratio so the full
  // composition is always visible. The container height follows the
  // natural aspect ratio of the uploaded file.
  return (
    <div className="relative w-full overflow-hidden bg-black">
      {first.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={first.previewUrl}
          alt="Preview"
          className="w-full h-auto object-contain"
        />
      ) : (
        <video
          src={first.previewUrl}
          className="w-full h-auto object-contain"
          muted
          playsInline
          preload="metadata"
        />
      )}
      {media.length > 1 && (
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          1/{media.length}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Platform preview renderers (high-fidelity, same as in edit-post-dialog)
// ---------------------------------------------------------------------

function renderPreviewForPlatform(
  platform: PreviewPlatform,
  content: string,
  media: { previewUrl: string; kind: "image" | "video" }[],
  profile: PreviewProfile,
  location: string | null,
  captionHintLabel: string,
  noMediaLabel: string,
) {
  switch (platform) {
    case "facebook":
      return (
        <div className="flex flex-col min-h-0 bg-[#242526] text-[#e4e6eb]">
          <div className="flex-1 overflow-visible px-2.5 pb-2.5">
            <article className="rounded-lg bg-[#18191a] p-2">
              <header className="mb-1 flex items-center gap-1.5">
                <AvatarInline url={profile.avatarUrl} name={profile.displayName} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#e4e6eb]">
                    {profile.displayName}
                  </p>
                  <p className="flex items-center gap-1 text-[9px] text-[#b0b3b8]">
                    {location ? <span>{location} · </span> : null}
                    <span>Právě teď</span>
                    <span aria-hidden> · 🌐</span>
                  </p>
                </div>
              </header>
              {content.trim() ? (
                <p className="mb-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#e4e6eb]">
                  {content}
                </p>
              ) : (
                <p className="mb-1 text-[12px] italic text-[#b0b3b8]/60">
                  {captionHintLabel}
                </p>
              )}
              <PreviewMediaArea media={media} aspect="feed" noMediaLabel={noMediaLabel} />
              <div className="mt-1 flex items-center justify-between text-[10px] text-[#b0b3b8]">
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-1">
                    <span className="inline-block rounded-full bg-[#1877F2] h-3.5 w-3.5 flex items-center justify-center text-[7px] text-white">👍</span>
                    <span className="inline-block rounded-full bg-[#F33E58] h-3.5 w-3.5 flex items-center justify-center text-[7px]">❤️</span>
                  </span>
                  0
                </span>
                <span>0 komentářů · 0 sdílení</span>
              </div>
              <div className="my-1 border-t border-white/5" />
              <div className="grid grid-cols-3 gap-0.5 text-[10px] font-medium text-[#b0b3b8]">
                <span className="flex items-center justify-center gap-1 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-sm">👍</span>
                  Líbí se mi
                </span>
                <span className="flex items-center justify-center gap-1 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-sm">💬</span>
                  Komentář
                </span>
                <span className="flex items-center justify-center gap-1 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                  <span aria-hidden className="text-sm">↗</span>
                  Sdílet
                </span>
              </div>
            </article>
          </div>
        </div>
      );

    case "instagram":
      return (
        <div className="flex flex-col min-h-0 bg-black text-white">
          <article className="flex-1 overflow-visible">
            <header className="flex items-center gap-1.5 px-2.5 py-1.5">
              <div className="rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[1.5px]">
                <div className="rounded-full bg-black p-[1.5px]">
                  <AvatarInline url={profile.avatarUrl} name={profile.displayName} size={24} />
                </div>
              </div>
              <p className="truncate text-[12px] font-semibold">{profile.displayName}</p>
            </header>
            <PreviewMediaArea media={media} aspect="square" noMediaLabel={noMediaLabel} />
            <div className="flex items-center gap-3 px-2.5 py-1 text-base">
              <span aria-hidden className="cursor-default">♡</span>
              <span aria-hidden className="cursor-default">💬</span>
              <span aria-hidden className="cursor-default">✈️</span>
              <span aria-hidden className="ml-auto cursor-default text-base">🔖</span>
            </div>
            <div className="px-2.5 pb-0.5 text-[12px] font-semibold">0 líbenek</div>
            <div className="px-2.5 pb-2.5 text-[12px]">
              {content.trim() ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  <span className="mr-1 font-semibold">{profile.displayName}</span>
                  {content}
                </p>
              ) : (
                <p className="italic text-white/40">{captionHintLabel}</p>
              )}
            </div>
          </article>
        </div>
      );

    case "youtube":
      return (
        <div className="flex flex-col min-h-0 bg-[#0f0f0f] text-white">
          <article className="flex-1 overflow-visible">
            <PreviewMediaArea media={media} aspect="video" noMediaLabel={noMediaLabel} />
            <h2 className="px-2.5 pt-1.5 text-[12px] font-semibold leading-snug text-white">
              {content.trim() ? (
                <span className="line-clamp-2 whitespace-pre-wrap break-words">
                  {content}
                </span>
              ) : (
                <span className="italic text-white/40">{captionHintLabel}</span>
              )}
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 pt-1.5">
              <AvatarInline url={profile.avatarUrl} name={profile.displayName} size={24} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white">
                  {profile.displayName}
                </p>
                <p className="text-[9px] text-white/60">0 subscribers</p>
              </div>
              <span
                aria-hidden
                className="rounded-full bg-[#FF0000] px-2 py-0.5 text-[9px] font-semibold text-white"
              >
                Subscribe
              </span>
            </div>
            <div className="mx-2.5 mt-1.5 rounded-xl bg-white/[0.06] p-1.5 text-[10px] text-white/85">
              <p className="font-medium text-white/70">0 views · just now</p>
              {content.trim() ? (
                <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                  {content}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-around px-2.5 py-1.5 text-[9px] text-white/80">
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">👍</span>
                <span>Like</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">👎</span>
                <span>Dislike</span>
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span aria-hidden className="text-sm leading-none">↗</span>
                <span>Share</span>
              </span>
            </div>
          </article>
        </div>
      );

    case "linkedin":
      return (
        <div className="flex flex-col min-h-0 bg-[#1a1a2e] text-[#e4e6eb]">
          <div className="flex-1 overflow-visible px-2.5 py-2">
            <article className="rounded-lg bg-[#1e1e36] shadow-sm">
              <header className="flex items-start gap-1.5 px-2 pt-2">
                <AvatarInline url={profile.avatarUrl} name={profile.displayName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#e4e6eb]">
                    {profile.displayName}
                  </p>
                  <p className="truncate text-[9px] text-[#b0b3b8]">
                    Professional · 1. stupen
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[9px] text-[#b0b3b8]">
                    <span>Právě teď</span>
                    <span aria-hidden>·</span>
                    <span aria-hidden>🌐</span>
                  </p>
                </div>
                <span aria-hidden className="text-sm text-[#b0b3b8]" title="More">
                  ⋯
                </span>
              </header>
              {content.trim() ? (
                <p className="whitespace-pre-wrap break-words px-2 pt-1 text-[12px] leading-relaxed text-[#e4e6eb]">
                  {content}
                </p>
              ) : (
                <p className="px-2 pt-1 text-[12px] italic text-[#b0b3b8]/60">
                  {captionHintLabel}
                </p>
              )}
              {media.length > 0 ? (
                <div className="mt-1 overflow-hidden bg-black">
                  <PreviewMediaArea media={media} aspect="feed" noMediaLabel={noMediaLabel} />
                </div>
              ) : null}
              <div className="flex items-center justify-between px-2 pb-0.5 pt-1 text-[9px] text-[#b0b3b8]">
                <span aria-hidden>👍❤️👏 0</span>
                <span>0 komentářů</span>
              </div>
              <div className="mx-2 border-t border-white/5" />
              <div className="grid grid-cols-4 gap-0.5 px-1 py-0.5 text-[9px] font-medium text-[#b0b3b8]">
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">👍</span>
                  <span>To se mi líbí</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">💬</span>
                  <span>Komentovat</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">🔁</span>
                  <span>Přeposlat</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 py-0.5">
                  <span aria-hidden className="text-sm leading-none">✈️</span>
                  <span>Odeslat</span>
                </span>
              </div>
            </article>
          </div>
        </div>
      );

    // TikTok – vertical full-screen player, action icons on right, text overlay at bottom
    case "tiktok": {
      const videoMedia = media.find((m) => m.kind === "video") ?? media[0];
      return (
        <div className="flex flex-col min-h-0 bg-black text-white">
          <article className="flex-1 overflow-visible relative">
            {/* Background / Video Area – fills article height with object-cover */}
            <div className="absolute inset-0">
              {videoMedia ? (
                videoMedia.kind === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={videoMedia.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={videoMedia.previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center bg-[#121212]">
                  <div className="text-center text-white/50">
                    <span className="mb-2 block text-3xl">🎵</span>
                    <p className="text-xs font-medium">{noMediaLabel}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Content overlay */}
            <div className="relative z-10 flex flex-col justify-end min-h-0">
              <div className="flex flex-row items-end justify-between p-3 pb-4">
                {/* Left column: Author & Description */}
                <div className="flex-1 pr-8 min-w-0">
                  <div className="mb-1.5 font-semibold text-[12px]">
                    @{profile.displayName.replace(/\s+/g, "").toLowerCase() || "tiktok_creator"}
                  </div>

                  {content.trim() ? (
                    <div className="text-xs text-white/90 font-normal leading-[1.3] line-clamp-3 mb-1.5">
                      {content}
                    </div>
                  ) : null}

                  {/* Original Sound */}
                  <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                    <svg className="w-3 h-3 animate-[spin_3s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <span className="truncate">původní zvuk - {profile.displayName}</span>
                  </div>
                </div>

                {/* Right column: Action buttons */}
                <div className="flex flex-col items-center justify-end gap-3.5">
                  {/* Avatar + Follow */}
                  <div className="relative mb-1">
                    <AvatarInline
                      url={profile.avatarUrl}
                      name={profile.displayName}
                      size={36}
                    />
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#EA4359] w-4 h-4 flex items-center justify-center text-white shadow-sm">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    </div>
                  </div>

                  {/* Like */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <span className="text-[9px] font-semibold">12.4K</span>
                  </div>

                  {/* Comment */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 20.01c.01.27-.1.52-.29.71-.2.2-.45.3-.71.29l-3.32-.23c-1.63.85-3.56 1.3-5.67 1.3-6.63 0-12-4.93-12-11C0 4.93 5.37 0 12 0s12 4.93 12 11c0 3.3-1.63 6.27-4.18 8.19l2.17 1.05v-.23z"></path></svg>
                    <span className="text-[9px] font-semibold">134</span>
                  </div>

                  {/* Bookmark */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>
                    <span className="text-[9px] font-semibold">456</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center gap-0.5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "scale(-1,1)" }}><path d="M21 11.5L9 4v5C4 9 2 13.5 2 19c2.5-3.5 6-4.5 7-4.5v5l12-7.5z"></path></svg>
                    <span className="text-[9px] font-semibold">12</span>
                  </div>

                  {/* Spinning Record */}
                  <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center animate-[spin_4s_linear_infinite] mt-1 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <AvatarInline
                      url={profile.avatarUrl}
                      name={profile.displayName}
                      size={18}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      );
    }

    default:
      return null;
  }
}
